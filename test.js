require.paths.unshift('vendor/minitest.js')
var minitest = require("minitest");
var assert   = require("assert");
var gnode    = require("./gnode");

minitest.setupListeners();

minitest.context('Gnode', function () {
  this.assertion("converts numbers to hex", function(test) {
    assert.equal("1", Gnode.toHex(1))
    assert.equal("fa0", Gnode.toHex(4000))
    assert.equal("fa1", Gnode.toHex(4001))
    assert.equal("fb0", Gnode.toHex(4016))
    assert.equal("c350", Gnode.toHex(50000))
    test.finished()
  });

  this.assertion("writes git packets, appending size", function(test) {
    assert.equal('0005a', Gnode.pktWrite('a'))
    assert.equal('0006ab', Gnode.pktWrite('ab'))
    assert.equal('0014the brown fox...', Gnode.pktWrite('the brown fox...'))
    test.finished()
  })

  this.assertion("writes a git packet flush", function(test) {
    assert.equal('0000', Gnode.pktFlush())
    test.finished()
  })
});
