import sys
import pytest
from unittest.mock import patch, MagicMock
from src.__main__ import main, parse_distribution
from src.validators.question_schema import DifficultyLevel

class TestMain:
    """Test the CLI entry point."""

    def test_parse_distribution_success(self):
        """Test successful parsing of difficulty distribution."""
        dist_str = "easy:10,medium:20,hard:15"
        result = parse_distribution(dist_str)
        assert result[DifficultyLevel.EASY] == 10
        assert result[DifficultyLevel.MEDIUM] == 20
        assert result[DifficultyLevel.HARD] == 15

    def test_parse_distribution_invalid_level(self):
        """Test parsing distribution with invalid difficulty level."""
        with pytest.raises(ValueError, match="Invalid difficulty level"):
            parse_distribution("easy:10,superhard:5")

    def test_parse_distribution_invalid_format(self):
        """Test parsing distribution with invalid format."""
        with pytest.raises(ValueError, match="Invalid distribution format"):
            parse_distribution("easy-10")

    @patch('src.__main__.DocumentParser')
    def test_cmd_extract(self, mock_parser_class):
        """Test the extract command."""
        mock_parser = mock_parser_class.return_value
        mock_parser.parse.return_value = "Extracted text"
        
        with patch('sys.stdout'):
            # Simulate CLI args: extract input.pdf
            test_args = ['prog', 'extract', 'input.pdf']
            with patch.object(sys, 'argv', test_args):
                main()
            
            mock_parser.parse.assert_called_once_with('input.pdf')

    @patch('src.__main__.QuestionGenerator')
    @patch('src.__main__.Path')
    def test_cmd_generate(self, mock_path_class, mock_generator_class):
        """Test the generate command."""
        mock_gen = mock_generator_class.return_value
        mock_response = MagicMock()
        mock_response.model_used = "test-model"
        mock_response.total_generated = 1
        mock_response.generation_time_ms = 100
        mock_response.token_count = 50
        mock_question = MagicMock()
        mock_question.model_dump.return_value = {"question": "What is 1+1?"}
        mock_response.questions = [mock_question]
        mock_gen.generate.return_value = mock_response
        
        mock_path_class.return_value.read_text.return_value = "Source text"
        
        with patch('sys.stdout'):
            # Simulate CLI args: generate input.txt --skill-id uuid --difficulty easy:1
            test_args = ['prog', 'generate', 'input.txt', '--skill-id', 'uuid', '--difficulty', 'easy:1']
            with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'}):
                with patch.object(sys, 'argv', test_args):
                    main()
            
            mock_gen.generate.assert_called_once()

    @patch('src.__main__.DocumentParser')
    @patch('src.__main__.QuestionGenerator')
    def test_cmd_pipeline(self, mock_generator_class, mock_parser_class):
        """Test the pipeline command."""
        mock_parser = mock_parser_class.return_value
        mock_parser.parse.return_value = "Extracted text"
        
        mock_gen = mock_generator_class.return_value
        mock_response = MagicMock()
        mock_response.model_used = "test-model"
        mock_response.total_generated = 1
        mock_response.generation_time_ms = 100
        mock_question = MagicMock()
        mock_question.model_dump.return_value = {"question": "Test?"}
        mock_response.questions = [mock_question]
        mock_gen.generate.return_value = mock_response
        
        with patch('sys.stdout'):
            test_args = ['prog', 'pipeline', 'input.pdf', '--skill-id', 'uuid', '--difficulty', 'easy:1']
            with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'}):
                with patch.object(sys, 'argv', test_args):
                    main()
            
            mock_parser.parse.assert_called_once_with('input.pdf')
            mock_gen.generate.assert_called_once()

    def test_no_command(self):
        """Test running with no command."""
        with patch('sys.stdout'):
            with patch.object(sys, 'argv', ['prog']):
                with pytest.raises(SystemExit) as excinfo:
                    main()
                assert excinfo.value.code == 1
