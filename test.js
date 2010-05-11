require.paths.unshift('vendor/minitest.js')
var minitest = require("minitest");
var assert   = require("assert");
var gnode    = require("./gnode");

minitest.setupListeners();

minitest.context('Gnode', function () {
  this.assertion("converts numbers to hex", function (test) {
    assert.equal("1", Gnode.toHex(1))
    assert.equal("fa0", Gnode.toHex(4000))
    assert.equal("fa1", Gnode.toHex(4001))
    assert.equal("fb0", Gnode.toHex(4016))
    assert.equal("c350", Gnode.toHex(50000))
    test.finished()
  });
});
