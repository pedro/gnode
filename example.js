gnode = require('./gnode')

gnode.run({
  root: '/home/git/',        // defaults to the current folder
  port: 3000,                // defaults to 8000
  git: '/usr/local/bin/git', // defaults to git
})