"""
AI-powered question generator using Gemini Flash or GPT-4o-mini.
"""

import os
import json
import time
import logging
from typing import Dict, Optional
from pydantic import ValidationError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from ..validators.question_schema import QuestionSchema, DifficultyLevel, GenerationResponse

logger = logging.getLogger(__name__)


class QuestionGenerator:
    """
    Generates curriculum questions from text using AI.
    Supports Gemini Flash (preferred) and OpenAI GPT-4o-mini.
    """
    
    DEFAULT_SYSTEM_PROMPT = """You are an expert curriculum designer for Questerix, an adaptive learning platform.

Your task is to generate high-quality educational questions from the provided text.

**CRITICAL RULES:**
1. Output ONLY valid JSON - no markdown, no explanations, no extra text.
2. Each question MUST follow the exact schema provided.
3. For multiple_choice questions:
   - Include an "options" array with objects: [{"id": "a", "text": "..."}, ...]
   - Set "solution" as: {"correct_option_id": "a"}
4. For text_input questions:
   - Set "options" as: {"placeholder": "Enter your answer"}
   - Set "solution" as: {"exact_match": "correct answer", "case_sensitive": false}
5. For boolean questions:
   - Set "options" as: {}
   - Set "solution" as: {"correct_value": true}
6. Always include a clear "explanation" for pedagogical value.
7. Distribute difficulties as requested.

**OUTPUT FORMAT:**
Return a JSON array of question objects ONLY. Example:
[
  {
    "content": "What is 2+2?",
    "type": "multiple_choice",
    "options": {"options": [{"id": "a", "text": "3"}, {"id": "b", "text": "4"}, {"id": "c", "text": "5"}]},
    "solution": {"correct_option_id": "b"},
    "explanation": "Basic arithmetic: 2+2=4",
    "points": 1,
    "difficulty": "easy"
  }
]
"""
    
    def __init__(
        self,
        model: str = "gemini-1.5-flash",
        temperature: float = 0.7,
        api_key: Optional[str] = None
    ):
        """
        Initialize the question generator.
        
        Args:
            model: Model identifier (gemini-1.5-flash, gpt-4o-mini)
            temperature: Creativity level (0.0-2.0)
            api_key: API key (or use environment variable)
        """
        self.model = model
        self.temperature = temperature
        
        # Determine provider
        if model.startswith("gemini"):
            self.provider = "gemini"
            if genai is None:
                raise ImportError("google-generativeai required. Install: pip install google-generativeai")
            
            api_key = api_key or os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable not set")
            
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel(model)
        
        elif model.startswith("gpt"):
            self.provider = "openai"
            if OpenAI is None:
                raise ImportError("openai required. Install: pip install openai")
            
            api_key = api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            
            self.client = OpenAI(api_key=api_key)
        
        else:
            raise ValueError(f"Unsupported model: {model}")
        
        logger.info(f"Initialized QuestionGenerator with {self.provider}/{self.model}")
    
    def generate(
        self,
        text: str,
        skill_id: str,
        difficulty_distribution: Dict[DifficultyLevel, int],
        custom_instructions: Optional[str] = None
    ) -> GenerationResponse:
        """
        Generate questions from source text.
        
        Args:
            text: Source material to generate questions from
            skill_id: Target skill UUID (for metadata)
            difficulty_distribution: How many questions per difficulty level
            custom_instructions: Optional user-specific instructions (will be sanitized)
            
        Returns:
            GenerationResponse with validated questions
        """
        start_time = time.time()
        
        # Sanitize custom_instructions to prevent prompt injection
        if custom_instructions:
            # Limit length and remove control characters
            custom_instructions = custom_instructions[:500]  # 500 char limit
            custom_instructions = ''.join(char for char in custom_instructions if ord(char) >= 32 or char in '\n\t')
            # Remove potential prompt injection patterns
            dangerous_patterns = [
                'system:', 'assistant:', 'user:', 
                'ignore previous', 'disregard', 'forget',
                'new instruction:', 'override', '<|im_end|>'
            ]
            for pattern in dangerous_patterns:
                if pattern.lower() in custom_instructions.lower():
                    logger.warning(f"Potentially dangerous pattern detected in custom_instructions: {pattern}")
                    custom_instructions = custom_instructions.replace(pattern, '')
        
        # Build prompt
        prompt = self._build_prompt(text, difficulty_distribution, custom_instructions)
        
        logger.info(f"Generating {sum(difficulty_distribution.values())} questions...")
        logger.debug(f"Prompt length: {len(prompt)} chars")
        
        # Call AI
        if self.provider == "gemini":
            raw_response = self._call_gemini(prompt)
        else:
            raw_response = self._call_openai(prompt)
        
        # Parse and validate
        try:
            # Validate response size before parsing
            if len(raw_response) > 50000:  # 50KB limit
                raise ValueError(f"AI response too large: {len(raw_response)} chars")
            
            questions_data = json.loads(raw_response)
            
            if not isinstance(questions_data, list):
                raise ValueError("AI response must be a JSON array")
            
            validated_questions = []
            for idx, q_data in enumerate(questions_data):
                try:
                    validated_questions.append(QuestionSchema(**q_data))
                except ValidationError as e:
                    logger.warning(f"Question {idx+1} failed validation: {e}")
                    # Skip invalid questions rather than failing entire batch
            
            generation_time = int((time.time() - start_time) * 1000)
            
            return GenerationResponse(
                questions=validated_questions,
                total_generated=len(validated_questions),
                token_count=len(prompt.split()) + len(raw_response.split()),  # Rough estimate
                generation_time_ms=generation_time,
                model_used=self.model
            )
        
        except json.JSONDecodeError as e:
            logger.error(f"AI returned invalid JSON: {e}")
            logger.debug(f"Raw response: {raw_response[:500]}...")
            raise ValueError(f"AI did not return valid JSON: {e}")
    
    def _build_prompt(
        self,
        text: str,
        difficulty_distribution: Dict[DifficultyLevel, int],
        custom_instructions: Optional[str]
    ) -> str:
        """Construct the full generation prompt."""
        total_questions = sum(difficulty_distribution.values())
        
        distribution_text = ", ".join([
            f"{count} {level.value}"
            for level, count in difficulty_distribution.items()
            if count > 0
        ])
        
        # Truncate text before the f-string to avoid comment leakage
        truncated_text = text[:4000]
        
        user_prompt = f"""Generate exactly {total_questions} questions from the following text.

**Distribution Required:**
{distribution_text}

**Source Text:**
{truncated_text}

{f"**Additional Instructions:** {custom_instructions}" if custom_instructions else ""}

Remember: Output ONLY the JSON array. No markdown, no explanations.
"""
        
        return f"{self.DEFAULT_SYSTEM_PROMPT}\n\n{user_prompt}"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((Exception,))
    )
    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API with retry logic and timeout protection."""
        import concurrent.futures
        
        def _do_call():
            return self.client.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=4096,
                ),
            )
        
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_do_call)
                response = future.result(timeout=30)  # 30s, cross-platform
            return response.text
        except concurrent.futures.TimeoutError:
            logger.error("Gemini API call timed out after 30 seconds")
            raise TimeoutError("Gemini API call timed out after 30 seconds")
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((Exception,))
    )
    def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API with retry logic and timeout protection."""
        import concurrent.futures
        
        def _do_call():
            return self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.DEFAULT_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=4096,
            )
        
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_do_call)
                response = future.result(timeout=30)  # 30s, cross-platform
            return response.choices[0].message.content
        except concurrent.futures.TimeoutError:
            logger.error("OpenAI API call timed out after 30 seconds")
            raise TimeoutError("OpenAI API call timed out after 30 seconds")
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
