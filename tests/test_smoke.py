import importlib

def test_core_modules_importable():
    modules = [
        'src.generators.question_generator',
        'src.parsers.document_parser',
        'src.validators.question_schema',
    ]
    for mod in modules:
        importlib.import_module(mod)
