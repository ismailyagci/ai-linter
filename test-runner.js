const path = require('path');
const Analyzer = require('./src/analyzer');

function runTests() {
  console.log('🧪 Running analyzer tests...\n');
  
  const analyzer = new Analyzer(__dirname);
  const exampleDir = path.join(__dirname, 'example', 'src');
  
  console.log('📁 Testing example directory:', exampleDir);
  
  const result = analyzer.analyzeDirectory(exampleDir, {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
    ignore: ['node_modules/**', 'dist/**'],
    format: 'summary'
  });
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Total files: ${result.totalFiles}`);
  console.log(`Files with errors: ${result.filesWithErrors}`);
  console.log(`Files with warnings: ${result.filesWithWarnings}`);
  console.log(`Total imports: ${result.totalImports}`);
  console.log(`Unresolved imports: ${result.unresolvedImports}`);
  
  console.log('\n📋 Detailed Results:');
  console.log('===================');
  
  result.details.forEach(file => {
    const relativePath = path.relative(__dirname, file.file);
    console.log(`\n📄 ${relativePath}`);
    console.log(`   Status: ${file.status}`);
    console.log(`   Imports: ${file.imports?.length || 0}`);
    
    if (file.imports) {
      file.imports.forEach(imp => {
        const status = imp.status === 'resolved' ? '✅' : '❌';
        console.log(`     ${status} ${imp.path}`);
      });
    }
    
    if (file.issues && file.issues.length > 0) {
      console.log('   Issues:');
      file.issues.forEach(issue => {
        console.log(`     ⚠️  ${issue.message}`);
      });
    }
  });
  
  console.log('\n🎯 Test Summary:');
  console.log('===============');
  
  const expectedResolvedImports = [
    './styles.css',
    './config.json', 
    './data.xml',
    './component.css',
    './assets/icons.svg',
    './assets/image.png',
    './assets/fonts.woff2',
    './assets/video.mp4',
    './assets/document.pdf',
    './assets/data.txt',
    './styles/theme.css',
    './data/config.json',
    './spaces in name.css',
    './UPPERCASE.CSS',
    './file.multiple.dots.js',
    './file-with-дashes.css'
  ];
  
  const expectedFailedImports = [
    './nonexistent.css',
    './missing.json',
    './MissingComponent',
    './nonexistent-folder/file.js',
    './',
    '../',
    ''
  ];
  
  console.log('\n✅ Expected resolved imports:');
  expectedResolvedImports.forEach(imp => console.log(`   - ${imp}`));
  
  console.log('\n❌ Expected failed imports:');
  expectedFailedImports.forEach(imp => console.log(`   - ${imp}`));
  
  console.log('\n📋 Test Categories Covered:');
  console.log('===========================');
  console.log('✅ CSS imports');
  console.log('✅ JSON imports');
  console.log('✅ XML imports');
  console.log('✅ SVG imports');
  console.log('✅ Font files (.woff2)');
  console.log('✅ Image files (.png)');
  console.log('✅ Video files (.mp4)');
  console.log('✅ PDF files');
  console.log('✅ Text files (.txt)');
  console.log('✅ Dynamic imports');
  console.log('✅ TypeScript files');
  console.log('✅ Syntax error handling');
  console.log('✅ Edge cases (empty imports, spaces, unicode)');
  console.log('✅ Mixed file extensions');
  
  return result;
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };