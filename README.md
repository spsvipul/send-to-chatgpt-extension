# Send to ChatGPT - Chrome Extension

A powerful Chrome extension that lets you select text on any webpage, add custom instructions, and send it directly to ChatGPT with one click.

## Features

- 🚀 **Quick Selection**: Select text on any webpage and send to ChatGPT instantly
- ⚡ **Auto-Send**: Direct deep-link integration with ChatGPT for one-click sending
- 📝 **Custom Instructions**: Add your own instructions before sending
- 💾 **Persistent Settings**: Save your preferences and default instructions
- 🎨 **Dark Mode**: Beautiful dark mode support
- 🌐 **Multi-language**: English and Japanese support
- ⌨️ **Keyboard Shortcuts**: `Ctrl+Shift+G` to activate, `Ctrl+Enter` to send
- 📋 **Clipboard Fallback**: Automatic clipboard backup when direct sending fails
- 🔧 **Configurable**: Extensive options page for customization

## Installation

### From Source

1. **Clone and build**:
   ```bash
   git clone <repository-url>
   cd gpt_extension/extension
   npm install
   npm run build
   ```

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked" and select the `dist` folder

3. **Permissions**:
   - Allow clipboard access when prompted
   - Grant permissions for active tab access

## Usage

### Basic Usage

1. **Select text** on any webpage
2. **Press `Ctrl+Shift+G`** or click the extension icon
3. **Add instructions** in the popup (optional)
4. **Click "Send"** or press `Ctrl+Enter`

### Advanced Features

- **Auto-send mode**: Enable in settings to skip the popup and send directly
- **Default instructions**: Set common instructions to be pre-filled
- **Context menu**: Right-click selected text → "Ask ChatGPT..."
- **Text truncation**: Automatically handles long text (configurable limit)

## Settings

Access the options page via `chrome://extensions/` → Extension options.

### General Settings
- **Auto-send**: Enable direct sending without popup
- **Default instructions**: Pre-fill instructions field
- **Default model**: Choose ChatGPT model (GPT-4o, GPT-4, GPT-3.5)
- **Max text length**: Set truncation limit (1000-16384 characters)

### Advanced Settings
- **Dark mode**: Toggle dark theme
- **Always save instructions**: Auto-save instructions as default
- **Settings export/import**: Backup and restore your configuration

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Activate extension |
| `Ctrl+Enter` | Send message (when popup is open) |
| `Escape` | Close popup |
| `Ctrl+S` | Save settings (options page) |

## Architecture

### Project Structure

```
extension/
├── src/
│   ├── background/     # Service worker
│   ├── content/        # Content script
│   ├── popup/          # Popup UI
│   ├── options/        # Options page
│   └── utils/          # Shared utilities
├── tests/
│   ├── unit/           # Jest unit tests
│   └── e2e/            # Playwright e2e tests
├── public/             # Static assets
└── dist/               # Built extension
```

### Key Components

- **Background Script**: Handles extension lifecycle and messaging
- **Content Script**: Captures text selection from web pages
- **Popup UI**: Modal interface with shadow DOM isolation
- **Options Page**: Comprehensive settings management
- **Storage Manager**: Persistent settings with sync support
- **Clipboard Utils**: Robust clipboard handling with fallbacks
- **ChatGPT Integration**: Deep-link and fallback mechanisms

## Development

### Setup

```bash
npm install
npm run dev        # Development build with watch
npm run build      # Production build
npm run test       # Run unit tests
npm run test:e2e   # Run e2e tests
npm run lint       # Lint code
```

### Testing

- **Unit tests**: Jest with Chrome API mocks
- **E2E tests**: Playwright with real Chrome browser
- **Coverage**: Minimum 85% code coverage required

### Architecture Decisions

- **Manifest V3**: Latest Chrome extension format
- **TypeScript**: Type safety and better development experience
- **Shadow DOM**: CSS isolation for popup UI
- **Modular design**: Clean separation of concerns
- **Robust error handling**: Graceful degradation strategies

## Privacy & Security

- **No data collection**: Extension never sends data to external servers
- **Local storage only**: All settings stored locally in Chrome
- **Clipboard access**: Only when explicitly requested by user
- **Minimal permissions**: Only requests necessary permissions
- **CSP compliance**: Content Security Policy enforced

## Browser Support

- **Chrome**: 88+ (Manifest V3 support)
- **Edge**: 88+ (Chromium-based)
- **Other Chromium browsers**: Should work but not officially supported

## Troubleshooting

### Common Issues

**Extension not activating**:
- Check that the extension is enabled in `chrome://extensions/`
- Verify keyboard shortcut isn't conflicting
- Try refreshing the page

**Auto-send not working**:
- Disable auto-send in settings and use clipboard mode
- Check if ChatGPT is accessible
- Verify popup blockers aren't interfering

**Clipboard not working**:
- Grant clipboard permissions when prompted
- Try on a different website (some sites block clipboard access)
- Check browser security settings

**Text not captured**:
- Ensure text is properly selected
- Try using the context menu instead
- Check if page allows content script injection

### Debug Information

Enable debug mode by:
1. Open `chrome://extensions/`
2. Find "Send to ChatGPT" extension
3. Click "Details" → "Extension options"
4. Enable debug logging in advanced settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass
5. Submit a pull request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier for formatting
- Jest for unit tests
- Playwright for e2e tests
- Conventional commits

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [repository-url]/wiki

---

Built with ❤️ using TypeScript, Vite, and modern web technologies. 