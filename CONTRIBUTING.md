# Contributing to Fastly MCP Server

Thank you for your interest in contributing to the Fastly MCP Server! We appreciate your help in making this project better.

## How to Contribute

### Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub:

1. Check if the issue already exists
2. Use a clear, descriptive title
3. Include steps to reproduce (for bugs)
4. Mention your environment (OS, Go version, etc.)

For security issues, please see our [Security Policy](SECURITY.md) instead of opening a public issue.

### Suggesting Enhancements

We welcome suggestions! When proposing features:

- Explain the use case and why it would be useful
- Consider how it fits with the project's security-first approach
- Be open to discussion and alternative approaches

### Pull Requests

We'd love to review your code contributions. Here's how:

1. **Fork and clone** the repository
2. **Create a branch** from `main` for your changes
3. **Make your changes** following our guidelines below
4. **Test thoroughly** including edge cases
5. **Submit a PR** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mcp.git
cd mcp

# Add upstream remote
git remote add upstream https://github.com/fastly/mcp.git

# Create a feature branch
git checkout -b feature/your-feature-name
```

## Code Guidelines

### Go Code Style

- Follow standard Go conventions and idioms
- Run `make fmt` before committing
- Run `make lint` and address any issues
- Keep functions focused and reasonably sized
- Add comments for exported functions and types

### Testing

- Write tests for new functionality
- Maintain or improve test coverage
- Run `make test` to ensure all tests pass
- Consider edge cases and error conditions

### Security Considerations

Given the security-sensitive nature of this project:

- Never bypass security validations
- Consider potential attack vectors in your changes
- Add tests for security-related code
- Document any security implications
- Err on the side of caution

### Commit Messages

Write clear commit messages that explain the "why":

```
Short summary (50 chars or less)

More detailed explanation if needed. Explain the problem this
commit solves and why this approach was chosen.

Fixes #123
```

## Testing Your Changes

Before submitting:

```bash
# Format your code
make fmt

# Run linting
make lint

# Run all tests
make test

# Run static analysis
make vet

# Build the binary
make build

# Test the binary manually
./bin/fastly-mcp list-commands
```

## Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Add tests** for new features
3. **Ensure CI passes** - we run tests automatically
4. **Be patient** - we'll review as soon as we can
5. **Be responsive** - we may suggest changes or ask questions

### What We Look For

- Clear code that's easy to understand
- Appropriate test coverage
- Consistency with existing patterns
- Security considerations addressed
- Documentation updated if needed

## Getting Help

- Check existing issues and pull requests
- Read the [README](README.md) and code documentation
- Ask questions in your pull request or issue

## Code of Conduct

Please be respectful and constructive in all interactions. We want this to be a welcoming project for everyone.

## Recognition

Contributors will be acknowledged in our release notes. Thank you for helping improve the Fastly MCP Server!

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers this project.