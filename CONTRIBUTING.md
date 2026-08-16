# Contributing to NGO Translator

Thank you for your interest in contributing to the NGO Translator project! This platform aims to democratize multilingual content accessibility for NGOs and educational organizations.

## Code of Conduct

Be respectful, inclusive, and professional. We're building tools for social good.

## How to Contribute

### 1. Reporting Bugs

If you find a bug, please create an issue with:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment**: Python version, OS, GPU/CPU, models used
- **Example input/output** if applicable (sanitized - no API keys!)

### 2. Requesting Features

Before requesting a feature:

- Check existing issues to avoid duplicates
- Explain the use case and benefits
- Consider how it fits into the NGO translator mission
- Describe expected inputs/outputs

### 3. Submitting Code

#### Setup Development Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

pip install -r requirements.txt
pip install pytest black pylint  # Dev tools

# Test the installation
python core/translate.py
python core/tts.py
python core/asr.py
```

#### Development Workflow

1. **Fork the repository** and create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following these guidelines:
   - Keep each module focused on a single responsibility
   - Add docstrings to all functions and classes
   - Include inline comments for complex logic
   - Test changes thoroughly

3. **Test your code**:

   ```bash
   # Run existing tests
   pytest tests/

   # Test individual modules
   python core/translate.py
   python core/tts.py
   python core/asr.py test_audio.wav

   # Run the API
   uvicorn app:app --reload
   ```

4. **Format your code**:

   ```bash
   black backend/
   pylint backend/core/
   ```

5. **Commit with clear messages**:

   ```bash
   git commit -m "feat: add Bengali language support"
   git commit -m "fix: handle empty transcript segments"
   git commit -m "docs: update API documentation"
   ```

   Use these prefixes:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvement
   - `test:` - Test addition

6. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

#### PR Review Process

- All PRs require review from maintainers
- Automated tests must pass
- Code review focuses on:
  - Correctness and performance
  - Alignment with project goals
  - Security considerations
  - Documentation completeness

### 4. Documentation Improvements

- Fix typos in README or code comments
- Clarify confusing sections
- Add examples for features
- Update performance benchmarks

## Development Guidelines

### Architecture Principles

- **Modularity**: Each component should be independently testable
- **Clarity**: Code should be readable without external documentation
- **CPU-First**: Optimize for CPU inference unless GPU support is explicitly added
- **NGO-Ready**: Consider deployment constraints for non-profit organizations

### Adding a New Language

1. Verify IndicTrans2 supports it: https://huggingface.co/ai4bharat
2. Verify MMS-TTS model exists: https://huggingface.co/facebook
3. Verify Faster-Whisper supports it
4. Update `LANG_CODES` in `core/translate.py`
5. Add model in `core/tts.py`
6. Update `WHISPER_LANG_HINTS` in `app.py`
7. Add tests and document in README

### Adding a New Feature

- Create isolated module in `core/`
- Write standalone test script
- Add FastAPI endpoint in `app.py`
- Document API in README
- Add to this CONTRIBUTING guide

### Performance & Resource Constraints

- Test on CPU with 8GB RAM
- Benchmark on typical hardware (2-4 year old laptop)
- Document processing time for standard inputs
- Optimize for hackathon/NGO deployment scenarios

## Project Structure

```
translator-app/
├── README.md                 # Project documentation
├── CONTRIBUTING.md          # This file
├── DEPLOYMENT.md            # Production deployment guide
├── LICENSE                  # MIT License
├── .gitignore              # Git ignore rules
├── .github/
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── workflows/          # GitHub Actions
└── backend/
    ├── app.py              # FastAPI application
    ├── requirements.txt    # Dependencies
    ├── core/               # Modular components
    │   ├── asr.py         # Speech-to-text
    │   ├── translate.py   # Translation
    │   ├── tts.py         # Text-to-speech
    │   ├── dubbing.py     # Audio synthesis
    │   ├── subtitles.py   # SRT generation
    │   └── av_utils.py    # Audio/Video utilities
    ├── uploads/           # Uploaded media
    ├── outputs/           # Generated files
    └── tests/             # Test suite
```

## Testing

### Unit Tests

```bash
pytest tests/test_translate.py -v
pytest tests/test_tts.py -v
pytest tests/test_asr.py -v
```

### Integration Tests

```bash
# Test full pipeline
pytest tests/test_integration.py -v
```

### Manual Testing

```bash
# Start server
uvicorn app:app --reload

# Test upload endpoint
curl -X POST -F "file=@test_video.mp4" http://127.0.0.1:8000/upload

# Access interactive docs
# Open http://127.0.0.1:8000/docs in browser
```

## Documentation Standards

### Code Comments

```python
def translate(text: str, source_lang: str, target_lang: str) -> str:
    """
    Translate text between supported languages using IndicTrans2.

    Args:
        text: Input text to translate (supports multi-line)
        source_lang: Source language ("english", "hindi", "marathi")
        target_lang: Target language ("english", "hindi", "marathi")

    Returns:
        Translated text in target language

    Raises:
        ValueError: If language pair not supported or model fails to load

    Examples:
        >>> translate("Hello", "english", "hindi")
        "नमस्ते"
    """
```

### README Sections

- Project overview & use cases
- Architecture & data flow
- Tech stack & models
- Setup & installation
- API documentation
- Performance characteristics
- Troubleshooting
- Development roadmap
- References & resources

## Communication

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Security**: Report vulnerabilities privately to maintainers
- **Email**: Contact project maintainers for sensitive topics

## Recognition

Contributors will be recognized in:

- README.md "Contributors" section
- Release notes
- Project credits

Thank you for making multilingual content accessible! 🌍

---

**Questions?** Open an issue or start a discussion in the repository.
