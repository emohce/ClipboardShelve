# uTools 插件内联引用其他插件逻辑文档

## 概述

uTools 插件可以通过 API 调用其他插件，实现插件间的功能协作和数据传递。本文档整理了 uTools 插件内联引用其他插件的相关 API 和配置方法。

## 核心调用 API

### utools.redirect(label[, payload])

跳转到另一个插件应用，并可以携带匹配指令的内容。如果插件应用不存在，则跳转到插件应用市场进行下载。

#### 类型定义

```typescript
function redirect(label: string | [string, string], payload?: any): boolean;
```

#### 参数说明

**label**
- 类型：`string | [string, string]`
- 当为 `string` 时：参数为指令名称
  - 底座会查找所有拥有该指令的插件应用
  - 如果只查找到一个插件应用则直接打开
  - 多个则让用户选择打开
  - 未找到将跳转至插件应用市场并搜索该指令名称
- 当为 `[string, string]` 时：第一个元素为插件应用名称，第二个元素为指令名称
  - 底座将定位到该插件应用并打开对应指令
  - 若插件应用未下载，将跳转至插件应用市场下载再打开

**payload**
- 类型：`any`
- 说明：跳转「功能指令」该参数设为空。若跳转「匹配指令」则该参数必须为指令可匹配的内容

#### 示例代码

```javascript
// 跳转到插件应用「聚合翻译」并翻译内容
utools.redirect(["聚合翻译", "翻译"], "hello world");

// 找到 "翻译" 指令，并自动跳转到对应插件应用
utools.redirect("翻译", "hello world");

// 跳转到插件应用「OCR 文字识别」并识别图片中文字
utools.redirect(["OCR 文字识别", "OCR 文字识别"], {
  type: "img",
  data: "data:image/png;base64,", // base64
});

// 跳转到插件应用「JSON 编辑器」查看 Json 文件
utools.redirect(["JSON 编辑器", "Json"], {
  type: "files",
  data: "/path/to/test.json", // 支持数组
});
```

## 动态指令 API

### utools.getFeatures([codes])

获取所有动态指令或特定指令。

#### 类型定义

```typescript
function getFeatures(codes?: string[]): Feature[];
```

#### 参数说明

**codes**
- 类型：`string[]`
- 说明：要获取的功能编码集合，可选参数

**Feature 接口**

```typescript
interface Feature {
  code: string;           // 功能编码
  explain?: string;       // 功能描述
  icon?: string;          // 功能图标
  platform?: string | string[];  // 指定功能可用平台
  mainHide?: boolean;     // 打开此功能不主动显示搜索框
  mainPush?: boolean;     // 是否向搜索框推送内容
  cmds: Cmd[];            // 指令集合
}
```

#### 示例代码

```javascript
// 获取所有动态功能
const features = utools.getFeatures();
console.log(features);

// 获取特定 code
const features = utools.getFeatures(["code-1", "code-2"]);
console.log(features);
```

### utools.setFeature(feature)

设置动态指令。

#### 类型定义

```typescript
function setFeature(feature: Feature): void;
```

#### 示例代码

```javascript
utools.setFeature({
  code: Date.now().toString(),
  explain: "测试动态功能",
  // "icon": "res/xxx.png",
  // "icon": "data:image/png;base64,xxx...",
  // "platform": ["win32", "darwin", "linux"]
  cmds: ["测试"],
});
```

### utools.removeFeature(code)

删除动态指令。

#### 类型定义

```typescript
function removeFeature(code: string): void;
```

## plugin.json 配置

### features 字段

`features` 定义插件应用的指令集合，一个插件应用可定义多个功能，一个功能可配置多条指令。

#### feature.code

功能编码，且必须唯一。用户进入插件应用时，uTools 会将该编码传入应用，用于区分不同功能并执行对应的逻辑。

#### feature.explain

功能描述（可选）。

#### feature.icon

功能图标文件，支持 `.png`、`.jpg`、`.svg` 格式。指定为相对于 `plugin.json` 的相对路径（可选）。

#### feature.mainPush

是否向搜索框推送内容（可选）。

#### feature.mainHide

当配置为 `true` 时，触发该功能的指令将不会主动显示主搜索框（可选）。

#### feature.cmds

配置该功能的指令集合，指令分「功能指令」和「匹配指令」。

## 指令类型

### 功能指令

功能指令用于在 uTools 搜索框直接搜索并打开插件应用功能。

**要求：**
- 功能指令名称必须简短、明确、唯一
- 禁止无意义、重复或模糊名称
- 中文指令无需额外配置拼音或首字母，uTools 会自动支持拼音和首字母搜索

**示例：**

```json
{
  "features": [
    {
      "code": "foo",
      "cmds": ["测试"]
    }
  ]
}
```

### 匹配指令

在 uTools 搜索框输入特定文本或粘贴图片、文件（或文件夹）时，匹配出可处理该内容的指令。

#### regex - 正则匹配特定文本

```json
{
  "features": [
    {
      "code": "regex",
      "cmds": [
        {
          "type": "regex",
          "label": "打开网址",
          "match": "/^https?:\\/\\/[^\\s/$.?#]\\S+$|^[a-z0-9][-a-z0-9]{0,62}(\\.[a-z0-9][-a-z0-9]{0,62}){1,10}(:[0-9]{1,5})?$/i",
          "minLength": 1,
          "maxLength": 1000
        }
      ]
    }
  ]
}
```

#### over - 匹配任意文本

```json
{
  "features": [
    {
      "code": "over",
      "cmds": [
        {
          "type": "over",
          "label": "百度一下",
          "exclude": "/\\n/",
          "minLength": 1,
          "maxLength": 500
        }
      ]
    }
  ]
}
```

#### img - 匹配图像

```json
{
  "features": [
    {
      "code": "img",
      "cmds": [
        {
          "type": "img",
          "label": "图像保存为文件"
        }
      ]
    }
  ]
}
```

#### files - 匹配文件(夹)

```json
{
  "features": [
    {
      "code": "files",
      "cmds": [
        {
          "type": "files",
          "label": "图片批量处理",
          "fileType": "file",
          "extensions": ["png", "jpg", "jpeg", "svg", "webp", "tiff", "avif", "heic", "bmp", "gif"],
          "minLength": 1,
          "maxLength": 100
        }
      ]
    }
  ]
}
```

#### window - 匹配当前活动的系统窗口

```json
{
  "features": [
    {
      "code": "window",
      "cmds": [
        {
          "type": "window",
          "label": "窗口置顶",
          "match": {
            "app": ["xxx.app", "xxx.exe"],
            "title": "/xxx/",
            "class": ["xxx"]
          }
        }
      ]
    }
  ]
}
```

## 插件间调用流程

1. **调用方插件**通过 `utools.redirect(label, payload)` 调用目标插件
2. **label** 可以是：
   - 指令名称（如 `"翻译"`）：uTools 会查找所有拥有该指令的插件
   - 插件名称 + 指令名称数组（如 `["聚合翻译", "翻译"]`）：精确定位到特定插件
3. **payload** 携带要传递给目标插件的数据
4. 如果目标插件未安装，uTools 会自动跳转到应用市场
5. 目标插件通过 `plugin.json` 中配置的 `feature.code` 接收调用

## 数据传递方式

### 文本数据

```javascript
utools.redirect(["翻译", "翻译"], "hello world");
```

### 图片数据

```javascript
utools.redirect(["OCR", "OCR"], {
  type: "img",
  data: "data:image/png;base64,iVBORw0KGgoAAAANS...",
});
```

### 文件数据

```javascript
utools.redirect(["JSON编辑器", "Json"], {
  type: "files",
  data: "/path/to/test.json",
});
```

## 注意事项

1. **正则表达式转义**：在 JSON 配置中，正则表达式的斜杠 `\` 需要多加一个，写成 `\\`
2. **任意匹配正则被忽略**：如 `/.*/`、`/(.)+/`、`/[\s\S]*/` 等会被 uTools 忽视
3. **功能编码唯一性**：`feature.code` 必须唯一，用于区分不同功能
4. **平台兼容性**：可通过 `platform` 字段指定功能可用平台（`win32`、`darwin`、`linux`）

## 参考文档

- [uTools 开发者文档 - 窗口 API](https://www.u-tools.cn/docs/developer/utools-api/window.html)
- [uTools 开发者文档 - 动态指令](https://www.u-tools.cn/docs/developer/utools-api/features.html)
- [uTools 开发者文档 - plugin.json 配置](https://www.u-tools.cn/docs/developer/information/plugin-json.html)
