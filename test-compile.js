// 简单的编译测试
const fs = require('fs')
const path = require('path')

const vueFilePath = path.join(__dirname, 'src/cpns/ClipItemList.vue')

try {
  const content = fs.readFileSync(vueFilePath, 'utf8')
  console.log('文件读取成功，长度:', content.length)
  
  // 检查基本的Vue文件结构
  const hasTemplate = content.includes('<template>')
  const hasScript = content.includes('<script setup>')
  const hasStyle = content.includes('<style')
  const hasTemplateEnd = content.includes('</template>')
  const hasScriptEnd = content.includes('</script>')
  const hasStyleEnd = content.includes('</style>')
  
  console.log('Vue文件结构检查:')
  console.log('- <template> 标签:', hasTemplate)
  console.log('- </template> 标签:', hasTemplateEnd)
  console.log('- <script setup> 标签:', hasScript)
  console.log('- </script> 标签:', hasScriptEnd)
  console.log('- <style 标签:', hasStyle)
  console.log('- </style> 标签:', hasStyleEnd)
  
  // 检查模板中的特殊字符
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    const templateContent = templateMatch[1]
    console.log('模板内容长度:', templateContent.length)
    
    // 检查是否有未闭合的标签
    const openTags = (templateContent.match(/<[^\/][^>]*>/g) || []).length
    const closeTags = (templateContent.match(/<\/[^>]*>/g) || []).length
    console.log('开放标签数量:', openTags)
    console.log('闭合标签数量:', closeTags)
  }
  
} catch (error) {
  console.error('读取文件失败:', error.message)
}
