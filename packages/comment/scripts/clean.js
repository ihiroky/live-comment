const fs = require('fs');

['dist', 'build'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true})
  }
})
