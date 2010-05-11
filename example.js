gnode = require('./gnode')

gnode.run({
  path: '/home/git/',        // default: to the current folder
  port: 3000,                // default: 8000
  git: '/usr/local/bin/git', // default: git
})