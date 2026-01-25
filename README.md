# ClipboardManager - Advanced Clipboard Management Plugin

## 📋 Project Overview

**ClipboardManager** is a powerful clipboard management plugin for uTools, built with Vue 3. It provides comprehensive clipboard history management with real-time monitoring, multi-device synchronization, and extensive customization capabilities.

### 🚀 Key Features

- **Real-time Clipboard Monitoring** - Captures text, images, and files automatically
- **History Management** - Configurable size limits (500-1000 items) and retention periods (1-31 days)
- **Multi-Select Operations** - Batch copy/paste with intelligent file merging
- **Advanced Search** - Multi-word search with AND logic support
- **Custom Operations** - Extensible action system with regex matching
- **Keyboard-Driven Interface** - Comprehensive keyboard shortcuts for power users
- **Multi-Device Support** - Separate databases per platform (Windows/macOS/Linux)
- **Collection System** - Star important items for permanent storage
- **Native Integration** - Uses platform-specific executables for optimal performance

### 🛠 Technology Stack

- **Frontend**: Vue 3 (Composition API) + Element Plus UI
- **Build**: Vue CLI + Webpack 4 + UglifyJS
- **Styling**: Less preprocessor
- **Integration**: uTools API + Electron APIs
- **Storage**: JSON file-based database with file watching
- **Monitoring**: Native clipboard executables per platform

---

## 🏗 Architecture Overview

### Component Hierarchy

```
App.vue (Root)
├── Main.vue (Primary Interface)
│   ├── ClipFloatBtn (Database operations)
│   ├── ClipFullData (Full content modal)
│   │   ├── ClipOperate (Item actions)
│   │   └── FileList (File display)
│   ├── ClipSwitch (Tab navigation)
│   │   └── ClipSearch (Search/filter)
│   └── ClipItemList (History list)
│       ├── ClipOperate (Per-item actions)
│       └── FileList (File preview)
└── Setting.vue (Configuration)
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CLIPBOARD MONITORING                                        │
├─────────────────────────────────────────────────────────────┤
│ Native Listener (listener.js)                               │
│ ↓ (on change)                                               │
│ pbpaste() → Extract text/file/image                         │
│ ↓                                                            │
│ MD5 hash → Check for duplicates                             │
│ ├─ YES: updateItemViaId() → Move to top                     │
│ └─ NO: addItem() → Insert at top                            │
│ ↓                                                            │
│ updateDataBaseLocal() → Write to disk                       │
│ ↓                                                            │
│ listener.emit('view-change') → Update Vue UI               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ UI RENDERING (Main.vue)                                     │
├─────────────────────────────────────────────────────────────┤
│ list = window.db.dataBase.data                              │
│ ↓                                                            │
│ Filter by type (all/text/image/file/collect)                │
│ ↓                                                            │
│ Filter by search text (case-insensitive)                    │
│ ↓                                                            │
│ Lazy load (15 items per scroll)                             │
│ ↓                                                            │
│ Render ClipItemList with keyboard navigation                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (compatible with Vue CLI 5.x)
- uTools application
- pnpm package manager (recommended)

### Installation

```bash
# Install dependencies
pnpm i

# Start development server (hot reload for views only)
pnpm run serve

# Build for production
pnpm run build
```

### Development Setup

1. **Development Mode**: `pnpm run serve` starts Vue dev server on port 8081
2. **Plugin Testing**: Load plugin in uTools development environment
3. **Hot Reload**: Views update automatically, restart plugin for preload changes
4. **Database**: Auto-created at `{home}/_utools_clipboard_manager_storage`

---

## 📁 Project Structure

```
clipboard-manager/
├── public/                     # Static assets and native executables
│   ├── plugin.json            # uTools plugin manifest
│   ├── preload.js             # Electron preload script
│   ├── listener.js            # Clipboard event monitoring
│   ├── time.js                # Async timing utilities
│   ├── time.worker.js         # Web Worker for sleep operations
│   └── index.html             # HTML template
├── src/
│   ├── main.js                # Vue app entry point
│   ├── App.vue                # Root component
│   ├── views/                 # Main view components
│   │   ├── Main.vue           # Primary clipboard interface
│   │   └── Setting.vue        # Configuration interface
│   ├── cpns/                  # Reusable Vue components
│   │   ├── ClipItemList.vue   # Clipboard item list
│   │   ├── ClipOperate.vue    # Action buttons
│   │   ├── ClipSearch.vue     # Search component
│   │   ├── ClipSwitch.vue     # Tab navigation
│   │   ├── ClipFullData.vue   # Full content modal
│   │   ├── ClipFloatBtn.vue   # Floating action button
│   │   └── FileList.vue       # File display component
│   ├── hooks/                 # Composition API hooks
│   │   └── useClipOperate.js  # Clipboard operation handlers
│   ├── utils/                 # Utility functions
│   │   └── index.js            # Date format, copy/paste, file ops
│   ├── global/                # Global initialization
│   │   ├── initPlugin.js      # Plugin initialization and DB class
│   │   ├── readSetting.js     # Settings management
│   │   └── restoreSetting.js  # Default settings
│   ├── data/                  # Configuration data
│   │   ├── setting.json       # Default settings
│   │   ├── operation.json     # Built-in operations
│   │   └── notify.json        # Version notifications
│   └── style/                 # Less stylesheets
│       ├── index.less         # Global styles
│       └── cpns/              # Component-specific styles
├── package.json               # Dependencies and scripts
├── vue.config.js              # Vue CLI configuration
└── README.md                  # This documentation
```

---

## ⚙️ Core Functionality

### Clipboard Data Structure

Each clipboard item follows this structure:

```javascript
{
  id: "md5_hash",              // Unique identifier based on content
  type: "text" | "file" | "image",
  data: "content_or_json",     // Text, base64 image, or file JSON
  createTime: 1640995200000,   // Timestamp when first captured
  updateTime: 1640995200000,   // Timestamp when last updated
  collect: boolean             // Optional: marked as favorite
}
```

### Database Schema

The clipboard database is stored as JSON:

```javascript
{
  data: [item1, item2, ...],  // Array of clipboard items
  createTime: 1640995200000,   // Database creation time
  updateTime: 1640995200000    // Last modification time
}
```

### Settings Configuration

```javascript
{
  "database": {
    "path": {
      "native_device_id": "/path/to/database.json"
    },
    "maxsize": 800,             // Maximum history items
    "maxage": 14                // Days to keep items (except collected)
  },
  "operation": {
    "shown": ["copy", "view", "collect", "un-collect", "remove"],
    "custom": [
      {
        "id": "custom.1663583455000",
        "title": "收藏到备忘快贴",
        "icon": "📌",
        "match": ["text", "image"],
        "command": "redirect:添加到「备忘快贴」"
      }
    ]
  }
}
```

---

## 🎮 User Interface & Interactions

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Switch between tabs (All/Text/Image/File/Collected) |
| `Ctrl+F` / `Ctrl+L` | Focus search box |
| `Escape` | Clear search → Hide search → Exit multi-select |
| `Shift` | Enter multi-select mode |
| `↑` / `↓` | Navigate items |
| `Enter` | Copy and paste selected item |
| `Space` | Toggle item selection in multi-select mode |
| `Ctrl+1-9` | Quick copy item N and paste |
| `Ctrl+C` | Copy selected items (multi-select: merge all) |
| `Left Click` | Copy and paste |
| `Right Click` | Copy only |

### Multi-Select Operations

- **Range Selection**: Shift+Click to select range of items
- **Individual Toggle**: Space to toggle selection
- **Batch Copy**: Merge text or combine files when copying multiple items
- **File Merging**: Automatically creates file references when mixed content selected

### Tab Categories

| Tab | Purpose | Filter |
|-----|---------|--------|
| All (🌐) | All clipboard items | None |
| Text (🎫) | Text content only | `type === 'text'` |
| Image (🖼️) | Images only | `type === 'image'` |
| File (📄) | Files only | `type === 'file'` |
| Collected (⭐) | Starred items | `collect === true` |

---

## 🔧 Custom Operations

### Operation Types

Built-in operations are defined in `src/data/operation.json`:

```javascript
[
  { "id": "copy", "title": "复制", "icon": "📄" },
  { "id": "view", "title": "查看全部", "icon": "💬" },
  { "id": "open-folder", "title": "打开文件夹", "icon": "📁" },
  { "id": "collect", "title": "收藏", "icon": "⭐" },
  { "id": "un-collect", "title": "移出收藏", "icon": "📤" },
  { "id": "remove", "title": "删除", "icon": "❌" },
  { "id": "word-break", "title": "分词", "icon": "💣" },
  { "id": "save-file", "title": "保存", "icon": "💾" }
]
```

### Adding Custom Operations

Custom operations can be added through the settings UI or directly in the configuration:

```javascript
{
  "id": "custom.unique_id",
  "title": "Custom Operation",
  "icon": "🔧",
  "match": ["text", "image", "file"],  // Content types to match
  "command": "redirect:PluginName"     // uTools plugin to redirect to
}
```

#### Advanced Matching

Use regex patterns for precise matching:

```javascript
{
  "id": "custom.image_processor",
  "title": "Process Images",
  "icon": "🖼️",
  "match": [
    "image",  // Match all images
    {
      "type": "file",
      "regex": ".(?:jpg|jpeg|png|gif)$"  // Match image files by extension
    }
  ],
  "command": "redirect:ImageProcessor"
}
```

---

## 🔌 Integration APIs

### Global Functions

The plugin exposes several global functions via `window`:

```javascript
// Database operations
window.db.dataBase.data              // Access clipboard history
window.db.addItem(item)              // Add new item
window.db.removeItemViaId(id)        // Remove item by ID
window.db.updateItemViaId(id)        // Update timestamp
window.db.emptyDataBase()            // Clear all items

// Clipboard operations
window.copy(item, isHideMainWindow)  // Copy to clipboard
window.paste()                       // Simulate paste (Ctrl+V/Cmd+V)
window.remove(item)                  // Remove item from DB
window.createFile(item)               // Create temp file from content

// UI operations
window.focus(isBlur)                  // Focus/blur search
window.toTop()                        // Scroll to top
window.listener                       // Clipboard event listener
```

### Utility Functions

Available in `src/utils/index.js`:

```javascript
import { dateFormat, pointToObj, copy, paste, createFile, getNativeId } from '../utils'

// Format timestamps as relative time
dateFormat(1640995200000)  // "2天前"

// Convert dotted object keys to nested objects
pointToObj({'database.path': '/path'})  // {database: {path: '/path'}}

// Copy operations
copy(item, false)  // Copy without hiding window
paste()            // Simulate paste

// Create temporary files from clipboard content
createFile(item)   // Returns file path

// Get platform-specific device ID
getNativeId()      // Returns unique platform identifier
```

### Event Handling

The plugin uses an event-driven architecture:

```javascript
// Listen for clipboard changes
window.listener.on('change', () => {
  // Update UI when clipboard changes
  list.value = window.db.dataBase.data
  updateShowList(activeTab.value)
})

// Listen for external database changes
window.listener.on('view-change', () => {
  // Refresh data when file is modified externally
  list.value = window.db.dataBase.data
  updateShowList(activeTab.value)
})
```

---

## 🛠 Development Guide

### Adding New Operations

1. **Define Operation**: Add to `src/data/operation.json` or create custom operation in settings
2. **Implement Handler**: Modify `src/hooks/useClipOperate.js`:

```javascript
} else if (id === 'your-new-operation') {
  // Implement your operation logic
  yourOperationHandler(item)
  emit('onOperateExecute')
}
```

3. **Filter Logic**: Update `filterOperate()` function:

```javascript
} else if (id === 'your-new-operation') {
  return item.type === 'text' // Define when to show this operation
}
```

### Modifying UI Components

#### Adding New Tabs

In `ClipSwitch.vue`, add new tab to the `tabs` array:

```javascript
const tabs = [
  { type: 'all', title: '全部', icon: 'Menu' },
  { type: 'text', title: '文本', icon: 'Tickets' },
  { type: 'image', title: '图片', icon: 'Picture' },
  { type: 'file', title: '文件', icon: 'Document' },
  { type: 'collect', title: '收藏', icon: 'Collection' },
  { type: 'your-type', title: 'Your Type', icon: 'YourIcon' }
]
```

Update the filtering logic in `Main.vue`'s `updateShowList()` function.

#### Extending Search Functionality

Modify `textFilterCallBack()` in `Main.vue` to add new search capabilities:

```javascript
const textFilterCallBack = (item) => {
  // Add your custom search logic here
  if (yourCustomCondition) {
    return true
  }
  // ... existing logic
}
```

### Database Schema Changes

To modify the database structure:

1. **Update Item Schema**: Modify the item structure in `initPlugin.js`
2. **Migration Logic**: Add migration in `readSetting.js` for backward compatibility
3. **Update Components**: Ensure all components handle the new schema

### Adding New Content Types

1. **Detection**: Update `pbpaste()` function in `initPlugin.js`
2. **Display**: Modify `ClipItemList.vue` to render new type
3. **Operations**: Add type-specific operations in `useClipOperate.js`

---

## 🔧 Configuration

### Environment Variables

The project uses Vue CLI environment variables. Create `.env.local` for local configuration:

```bash
# .env.local
VUE_APP_TITLE=ClipboardManager
VUE_APP_API_BASE_URL=http://localhost:8081
```

### Build Configuration

`vue.config.js` contains build optimizations:

```javascript
module.exports = {
  publicPath: './',
  productionSourceMap: false,
  chainWebpack: (config) => {
    // UglifyJS configuration for minification
    config.optimization.minimizer('uglify-plugin').use(UglifyJsPlugin, [{
      uglifyOptions: {
        drop_console: false,
        drop_debugger: false,
        pure_funcs: ['console.log']
      }
    }])
  }
}
```

### Plugin Configuration

`public/plugin.json` defines the uTools plugin manifest:

```javascript
{
  "pluginName": "超级剪贴板",
  "description": "强大的剪贴板管理工具",
  "main": "index.html",
  "preload": "preload.js",
  "development": {
    "main": "http://localhost:8081/"
  },
  "platform": ["win32", "darwin", "linux"],
  "features": [
    {
      "code": "clipboard",
      "explain": "剪切板历史、剪贴板快速粘贴",
      "cmds": ["剪切板", "剪贴板", "Clipboard"]
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Native Listener Fails to Start

**Symptoms**: Console shows "剪贴板监听程序不存在" or listener doesn't start

**Solutions**:
- Check if native executables exist in database directory
- Verify executable permissions on Linux/macOS
- Plugin will fall back to polling (300ms intervals)

#### 2. Database Corruption

**Symptoms**: Items not displaying correctly or errors on startup

**Solutions**:
- Clear database via floating button in Main view
- Delete database file manually and restart plugin
- Database auto-recreates on next startup

#### 3. Performance Issues

**Symptoms**: UI lag when many items stored

**Solutions**:
- Reduce `maxsize` setting in configuration
- Clear old items manually
- Optimize image data (large images cause delays)

#### 4. Search Not Working

**Symptoms**: Search returns no results or incorrect results

**Solutions**:
- Check filter text for special characters
- Images are excluded from text search by design
- Use correct case (search is case-insensitive)

### Debug Procedures

1. **Enable Console**: Open uTools developer tools to view console logs
2. **Check Database**: Inspect `{home}/_utools_clipboard_manager_storage/database.json`
3. **Monitor Events**: Watch for 'change' and 'view-change' events in console
4. **Validate Settings**: Check `utools.dbStorage.getItem('setting')` for corruption

### Performance Optimization

1. **Lazy Loading**: Currently loads 15 items per scroll - adjust `GAP` in `Main.vue`
2. **Image Optimization**: Large images stored as base64 - consider compression
3. **Polling Interval**: Reduce from 300ms if CPU usage is high
4. **Memory Usage**: Database loaded entirely in memory - consider pagination for large datasets

---

## 🤝 Contributing

### Development Workflow

1. **Fork Repository**: Create fork on GitHub
2. **Create Branch**: Use descriptive branch names
3. **Install Dependencies**: `pnpm i`
4. **Make Changes**: Follow existing code patterns
5. **Test**: Verify functionality in uTools
6. **Submit PR**: Include clear description of changes

### Code Standards

- Use Vue 3 Composition API with `<script setup>`
- Follow existing naming conventions (PascalCase for components)
- Add meaningful comments for complex logic
- Use Less for styling with consistent variable naming
- Follow [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

### Testing

- Test on all supported platforms (Windows/macOS/Linux)
- Verify keyboard shortcuts work correctly
- Test custom operations and regex matching
- Validate database migrations and backwards compatibility

---

## 📄 License

This project is open source. Check the `LICENSE` file for specific licensing information.

---

## 🙏 Acknowledgments

- **uTools** - For providing the plugin platform
- **Vue.js** - For the reactive UI framework
- **Element Plus** - For the comprehensive UI components
- **inu1255** - For the time utilities and worker implementation

---

## 📞 Support

- **Documentation**: [Project Website](https://ziuchen.gitee.io/project/ClipboardManager/)
- **Issues**: [GitHub Issues](https://github.com/ZiuChen/ClipboardManager)
- **Community**: [uTools Forum](https://yuanliao.info/d/5722)
- **QQ Group**: Available on project website

---

*This documentation provides a comprehensive understanding of the ClipboardManager project structure, functionality, and development guidelines. For specific implementation details, refer to the source code and inline comments.*