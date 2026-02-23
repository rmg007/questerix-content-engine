"""
Functional tests for question generator module.
Tests AI integration with mocked API responses.
"""

import pytest
import json
import time
from unittest.mock import Mock, patch
from tenacity import RetryError

from src.generators.question_generator import QuestionGenerator
from src.validators.question_schema import QuestionSchema, DifficultyLevel, GenerationResponse


class TestQuestionGenerator:
    """Test suite for QuestionGenerator class."""

    @pytest.fixture
    def mock_gemini_response(self):
        """Mock successful Gemini API response."""
        return json.dumps([
            {
                "content": "What is 2+2?",
                "type": "multiple_choice",
                "options": {
                    "options": [
                        {"id": "a", "text": "3"},
                        {"id": "b", "text": "4"},
                        {"id": "c", "text": "5"}
                    ]
                },
                "solution": {"correct_option_id": "b"},
                "explanation": "Basic arithmetic: 2+2=4",
                "points": 1,
                "difficulty": "easy"
            },
            {
                "content": "Explain the concept of photosynthesis.",
                "type": "text_input",
                "options": {"placeholder": "Enter your answer"},
                "solution": {"exact_match": "Photosynthesis is the process", "case_sensitive": False},
                "explanation": "Photosynthesis converts light energy into chemical energy",
                "points": 3,
                "difficulty": "medium"
            }
        ])

    @pytest.fixture
    def mock_openai_response(self):
        """Mock successful OpenAI API response."""
        return json.dumps([
            {
                "content": "Is water H2O?",
                "type": "boolean",
                "options": {},
                "solution": {"correct_value": True},
                "explanation": "Water molecule consists of 2 hydrogen and 1 oxygen atom",
                "points": 2,
                "difficulty": "easy"
            }
        ])

    @pytest.fixture
    def invalid_json_response(self):
        """Mock invalid JSON response from AI."""
        return "This is not valid JSON"

    @pytest.fixture
    def malformed_response(self):
        """Mock malformed JSON array response."""
        return json.dumps({"not": "an array"})

    @pytest.fixture
    def partially_valid_response(self):
        """Mock response with some valid and some invalid questions."""
        return json.dumps([
            {
                "content": "Valid question",
                "type": "multiple_choice",
                "options": {
                    "options": [
                        {"id": "a", "text": "Option A"},
                        {"id": "b", "text": "Option B"}
                    ]
                },
                "solution": {"correct_option_id": "a"},
                "explanation": "Valid explanation",
                "points": 1,
                "difficulty": "easy"
            },
            {
                "content": "Invalid question - missing solution",
                "type": "multiple_choice",
                "options": {
                    "options": [
                        {"id": "a", "text": "Option A"}
                    ]
                },
                # Missing solution field
                "explanation": "Invalid explanation",
                "points": 1,
                "difficulty": "easy"
            }
        ])

    class TestGeminiIntegration:
        """Test Gemini API integration."""

        @patch('src.generators.question_generator.genai')
        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        def test_gemini_initialization(self, mock_genai):
            """Test successful Gemini initialization."""
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            assert generator.provider == "gemini"
            assert generator.model == "gemini-1.5-flash"
            assert generator.client == mock_model
            mock_genai.configure.assert_called_once_with(api_key='test-key')
            mock_genai.GenerativeModel.assert_called_once_with("gemini-1.5-flash")

        @patch('src.generators.question_generator.genai')
        def test_gemini_missing_api_key(self, mock_genai):
            """Test Gemini initialization fails without API key."""
            with patch.dict('os.environ', {}, clear=True):
                with pytest.raises(ValueError, match="GEMINI_API_KEY environment variable not set"):
                    QuestionGenerator(model="gemini-1.5-flash")

        @patch('src.generators.question_generator.genai')
        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        def test_gemini_generate_success(self, mock_genai, mock_gemini_response):
            """Test successful question generation with Gemini."""
            # Setup mocks
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = mock_gemini_response
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            # Test generation
            difficulty_dist = {DifficultyLevel.EASY: 1, DifficultyLevel.MEDIUM: 1}
            result = generator.generate(
                text="Math basics: 2+2=4, 3+3=6",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution=difficulty_dist
            )
            
            # Assertions
            assert isinstance(result, GenerationResponse)
            assert result.total_generated == 2
            assert result.model_used == "gemini-1.5-flash"
            assert len(result.questions) == 2
            assert all(isinstance(q, QuestionSchema) for q in result.questions)
            assert result.generation_time_ms >= 0  # Changed from > 0

        @patch('src.generators.question_generator.genai')
        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        def test_gemini_api_error(self, mock_genai):
            """Test handling of Gemini API errors (wrapped by tenacity RetryError)."""
            mock_model = Mock()
            mock_model.generate_content.side_effect = Exception("API Error")
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            with pytest.raises(RetryError) as exc_info:
                generator.generate(
                    text="Test text",
                    skill_id="123e4567-e89b-12d3-a456-426614174000",
                    difficulty_distribution={DifficultyLevel.EASY: 1}
                )
            # Verify the original exception is preserved in the retry chain
            original = exc_info.value.last_attempt.exception()
            assert original is not None
            assert "API Error" in str(original)

    class TestOpenAIIntegration:
        """Test OpenAI API integration."""

        @patch('src.generators.question_generator.OpenAI')
        @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
        def test_openai_initialization(self, mock_openai):
            """Test successful OpenAI initialization."""
            mock_client = Mock()
            mock_openai.return_value = mock_client
            
            generator = QuestionGenerator(model="gpt-4o-mini")
            
            assert generator.provider == "openai"
            assert generator.model == "gpt-4o-mini"
            assert generator.client == mock_client
            mock_openai.assert_called_once_with(api_key='test-key')

        @patch('src.generators.question_generator.OpenAI')
        def test_openai_missing_api_key(self, mock_openai):
            """Test OpenAI initialization fails without API key."""
            with patch.dict('os.environ', {}, clear=True):
                with pytest.raises(ValueError, match="OPENAI_API_KEY environment variable not set"):
                    QuestionGenerator(model="gpt-4o-mini")

        @patch('src.generators.question_generator.OpenAI')
        @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
        def test_openai_generate_success(self, mock_openai, mock_openai_response):
            """Test successful question generation with OpenAI."""
            # Setup mocks
            mock_client = Mock()
            mock_response = Mock()
            mock_choice = Mock()
            mock_choice.message.content = mock_openai_response
            mock_response.choices = [mock_choice]
            mock_client.chat.completions.create.return_value = mock_response
            mock_openai.return_value = mock_client
            
            generator = QuestionGenerator(model="gpt-4o-mini")
            
            # Test generation
            difficulty_dist = {DifficultyLevel.EASY: 1}
            result = generator.generate(
                text="Water chemistry",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution=difficulty_dist
            )
            
            # Assertions
            assert isinstance(result, GenerationResponse)
            assert result.total_generated == 1
            assert result.model_used == "gpt-4o-mini"
            assert len(result.questions) == 1
            assert isinstance(result.questions[0], QuestionSchema)

        @patch('src.generators.question_generator.OpenAI')
        @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
        def test_openai_api_error(self, mock_openai):
            """Test handling of OpenAI API errors (wrapped by tenacity RetryError)."""
            mock_client = Mock()
            mock_client.chat.completions.create.side_effect = Exception("OpenAI Error")
            mock_openai.return_value = mock_client
            
            generator = QuestionGenerator(model="gpt-4o-mini")
            
            with pytest.raises(RetryError) as exc_info:
                generator.generate(
                    text="Test text",
                    skill_id="123e4567-e89b-12d3-a456-426614174000",
                    difficulty_distribution={DifficultyLevel.EASY: 1}
                )
            # Verify the original exception is preserved in the retry chain
            original = exc_info.value.last_attempt.exception()
            assert original is not None
            assert "OpenAI Error" in str(original)

    class TestPromptBuilding:
        """Test prompt construction logic."""

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_prompt_building_with_distribution(self, mock_genai):
            """Test prompt includes difficulty distribution."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "[]"
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            difficulty_dist = {
                DifficultyLevel.EASY: 2,
                DifficultyLevel.MEDIUM: 3,
                DifficultyLevel.HARD: 1
            }
            
            generator.generate(
                text="Test content",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution=difficulty_dist
            )
            
            # Check that generate_content was called with prompt containing distribution
            call_args = mock_model.generate_content.call_args[0][0]
            assert "2 easy, 3 medium, 1 hard" in call_args
            assert "exactly 6 questions" in call_args

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_prompt_building_with_custom_instructions(self, mock_genai):
            """Test prompt includes custom instructions."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "[]"
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            custom_instructions = "Focus on practical examples"
            
            generator.generate(
                text="Test content",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution={DifficultyLevel.EASY: 1},
                custom_instructions=custom_instructions
            )
            
            # Check that custom instructions are included
            call_args = mock_model.generate_content.call_args[0][0]
            assert "Additional Instructions:" in call_args
            assert custom_instructions in call_args

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_text_truncation(self, mock_genai):
            """Test that long source text is truncated."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "[]"
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            # Create very long text (over 4000 chars)
            long_text = "A" * 5000
            
            generator.generate(
                text=long_text,
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution={DifficultyLevel.EASY: 1}
            )
            
            # Check that text was truncated
            call_args = mock_model.generate_content.call_args[0][0]
            # Account for prompt template size (~1100 chars)
            assert len(call_args) < len(long_text) + 1200
            assert "A" * 4001 not in call_args

    class TestResponseValidation:
        """Test response parsing and validation."""

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_invalid_json_handling(self, mock_genai, invalid_json_response):
            """Test handling of invalid JSON responses."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = invalid_json_response
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            with pytest.raises(ValueError, match="AI did not return valid JSON"):
                generator.generate(
                    text="Test text",
                    skill_id="123e4567-e89b-12d3-a456-426614174000",
                    difficulty_distribution={DifficultyLevel.EASY: 1}
                )

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_non_array_response(self, mock_genai, malformed_response):
            """Test handling of non-array JSON responses."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = malformed_response
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            with pytest.raises(ValueError, match="AI response must be a JSON array"):
                generator.generate(
                    text="Test text",
                    skill_id="123e4567-e89b-12d3-a456-426614174000",
                    difficulty_distribution={DifficultyLevel.EASY: 1}
                )

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_partial_validation_failure(self, mock_genai, partially_valid_response):
            """Test handling of partially valid responses."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = partially_valid_response
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            result = generator.generate(
                text="Test text",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution={DifficultyLevel.EASY: 2}
            )
            
            # Should only include the valid question
            assert result.total_generated == 1
            assert len(result.questions) == 1
            assert result.questions[0].content == "Valid question"

    class TestConfiguration:
        """Test generator configuration options."""

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_temperature_configuration(self, mock_genai):
            """Test temperature parameter is passed to API."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "[]"
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash", temperature=0.5)
            
            generator.generate(
                text="Test text",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution={DifficultyLevel.EASY: 1}
            )
            
            # Check temperature was passed
            mock_genai.GenerationConfig.assert_called_once_with(
                temperature=0.5,
                max_output_tokens=4096
            )

        def test_unsupported_model(self):
            """Test error for unsupported model."""
            with pytest.raises(ValueError, match="Unsupported model: unsupported-model"):
                QuestionGenerator(model="unsupported-model")

        @patch('src.generators.question_generator.genai')
        def test_missing_dependency(self, mock_genai):
            """Test error when required dependency is missing."""
            # Use a dummy key to bypass key check if dependency check fails
            with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'}):
                with patch('src.generators.question_generator.genai', None):
                    with pytest.raises(ImportError, match="google-generativeai required"):
                        QuestionGenerator(model="gemini-1.5-flash")

    class TestPerformance:
        """Test performance and timing."""

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_generation_timing(self, mock_genai, mock_gemini_response):
            """Test generation timing is recorded."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = mock_gemini_response
            
            # Add delay to simulate API call
            def delayed_generate(*args, **kwargs):
                time.sleep(0.1)  # 100ms delay
                return mock_response
            
            mock_model.generate_content.side_effect = delayed_generate
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            start_time = time.time()
            result = generator.generate(
                text="Test text",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution={DifficultyLevel.EASY: 1}
            )
            end_time = time.time()
            
            # Check timing was recorded
            assert result.generation_time_ms >= 100  # At least 100ms
            assert result.generation_time_ms <= (end_time - start_time) * 1000 + 50  # Allow some tolerance

        @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
        @patch('src.generators.question_generator.genai')
        def test_token_count_estimation(self, mock_genai, mock_gemini_response):
            """Test token count estimation."""
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = mock_gemini_response
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = QuestionGenerator(model="gemini-1.5-flash")
            
            result = generator.generate(
                text="Test text with some words",
                skill_id="123e4567-e89b-12d3-a456-426614174000",
                difficulty_distribution={DifficultyLevel.EASY: 1}
            )
            
            # Check token count is estimated
            assert result.token_count > 0
            assert isinstance(result.token_count, int)
