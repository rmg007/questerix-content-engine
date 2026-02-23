"""
CLI entry point for content-engine.
"""

import sys
import argparse
import logging
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from src.parsers.document_parser import DocumentParser
from src.generators.question_generator import QuestionGenerator
from src.validators.question_schema import DifficultyLevel

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_distribution(dist_str: str) -> dict:
    """Parse difficulty distribution from CLI string."""
    # Format: "easy:10,medium:20,hard:10"
    distribution = {}
    
    try:
        for pair in dist_str.split(','):
            level, count = pair.split(':')
            level = level.strip().lower()
            count = int(count.strip())
            
            if level not in ['easy', 'medium', 'hard']:
                raise ValueError(f"Invalid difficulty level: {level}")
            
            distribution[DifficultyLevel(level)] = count
        
        return distribution
    
    except Exception as e:
        raise ValueError(f"Invalid distribution format: {e}")


def cmd_extract(args):
    """Extract text from a document."""
    parser = DocumentParser()
    
    try:
        text = parser.parse(args.input)
        
        if args.output:
            Path(args.output).write_text(text, encoding='utf-8')
            logger.info(f"Saved extracted text to: {args.output}")
        else:
            print(text)
    
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        sys.exit(1)


def cmd_generate(args):
    """Generate questions from text."""
    generator = QuestionGenerator(
        model=args.model,
        temperature=args.temperature
    )
    
    try:
        # Read source text
        if args.input == '-':
            text = sys.stdin.read()
        else:
            text = Path(args.input).read_text(encoding='utf-8')
        
        # Parse distribution
        distribution = parse_distribution(args.difficulty)
        
        # Generate
        response = generator.generate(
            text=text,
            skill_id=args.skill_id,
            difficulty_distribution=distribution,
            custom_instructions=args.instructions
        )
        
        # Output
        output_data = {
            "metadata": {
                "model": response.model_used,
                "total_generated": response.total_generated,
                "generation_time_ms": response.generation_time_ms,
                "token_count": response.token_count
            },
            "questions": [q.model_dump() for q in response.questions]
        }
        
        if args.output:
            Path(args.output).write_text(json.dumps(output_data, indent=2), encoding='utf-8')
            logger.info(f"Saved {response.total_generated} questions to: {args.output}")
        else:
            print(json.dumps(output_data, indent=2))
    
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        sys.exit(1)


def cmd_pipeline(args):
    """Full pipeline: extract + generate."""
    parser = DocumentParser()
    generator = QuestionGenerator(
        model=args.model,
        temperature=args.temperature
    )
    
    try:
        # Step 1: Extract
        logger.info("Step 1: Extracting text...")
        text = parser.parse(args.input)
        logger.info(f"Extracted {len(text)} characters")
        
        # Step 2: Generate
        logger.info("Step 2: Generating questions...")
        distribution = parse_distribution(args.difficulty)
        
        response = generator.generate(
            text=text,
            skill_id=args.skill_id,
            difficulty_distribution=distribution,
            custom_instructions=args.instructions
        )
        
        # Output
        output_data = {
            "metadata": {
                "source_file": args.input,
                "model": response.model_used,
                "total_generated": response.total_generated,
                "generation_time_ms": response.generation_time_ms
            },
            "questions": [q.model_dump() for q in response.questions]
        }
        
        if args.output:
            Path(args.output).write_text(json.dumps(output_data, indent=2), encoding='utf-8')
            logger.info(f"✓ Pipeline complete! {response.total_generated} questions saved to: {args.output}")
        else:
            print(json.dumps(output_data, indent=2))
    
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Questerix Content Engine - AI-powered curriculum generation"
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Extract command
    extract_parser = subparsers.add_parser('extract', help='Extract text from document')
    extract_parser.add_argument('input', help='Input file path')
    extract_parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    extract_parser.set_defaults(func=cmd_extract)
    
    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate questions from tech')
    generate_parser.add_argument('input', help='Input text file (or "-" for stdin)')
    generate_parser.add_argument('--skill-id', required=True, help='Target skill UUID')
    generate_parser.add_argument('--difficulty', required=True, help='Distribution (e.g., easy:10,medium:20,hard:10)')
    generate_parser.add_argument('--model', default='gemini-1.5-flash', help='AI model to use')
    generate_parser.add_argument('--temperature', type=float, default=0.7, help='Generation temperature')
    generate_parser.add_argument('--instructions', help='Custom instructions for AI')
    generate_parser.add_argument('-o', '--output', help='Output JSON file (default: stdout)')
    generate_parser.set_defaults(func=cmd_generate)
    
    # Pipeline command
    pipeline_parser = subparsers.add_parser('pipeline', help='Full pipeline (extract + generate)')
    pipeline_parser.add_argument('input', help='Input document file')
    pipeline_parser.add_argument('--skill-id', required=True, help='Target skill UUID')
    pipeline_parser.add_argument('--difficulty', required=True, help='Distribution (e.g., easy:10,medium:20,hard:10)')
    pipeline_parser.add_argument('--model', default='gemini-1.5-flash', help='AI model to use')
    pipeline_parser.add_argument('--temperature', type=float, default=0.7, help='Generation temperature')
    pipeline_parser.add_argument('--instructions', help='Custom instructions for AI')
    pipeline_parser.add_argument('-o', '--output', help='Output JSON file (default: stdout)')
    pipeline_parser.set_defaults(func=cmd_pipeline)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == '__main__':
    main()
