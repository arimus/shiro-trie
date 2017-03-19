'use strict';

var isNode = typeof process !== 'undefined';
if (isNode) {
  var chai = require('chai');
  var expect = chai.expect;
  var assert = chai.assert;
  var shiroTrie = require('../');
}

var trie;

describe('shiro-trie node module', function() {
  describe('basic check of testing library', function() {
    it('assert that JavaScript is still a little crazy', function() {
      expect([] + []).to.equal('');
    });
    it('undefined is not a function', function(done) {
      expect(typeof undefined).to.not.eql('function');
      done();
    });
  });

  describe('building permission trie', function() {
    beforeEach(function(done) {
      trie = shiroTrie.new();
      done();
    });
    it('single permission', function(done) {
      trie.add('a:b:c:d');
      expect(trie.get()).to.eql({ a: { b: { c: { d: { '*': {} } } } } });
      done();
    });
    it('two single permissions', function(done) {
      trie.add('a:b:c:d');
      trie.add('a:c:c:d');
      expect(trie.get()).to.eql({ a: { b: { c: { d: { '*': {} } } }, c: { c: { d: { '*': {} } } } } });
      done();
    });
    it('two permissions as args', function(done) {
      trie.add('a:b:c:d', 'a:c:c:d');
      expect(trie.get()).to.eql({ a: { b: { c: { d: { '*': {} } } }, c: { c: { d: { '*': {} } } } } });
      done();
    });
    it('two permissions as array', function(done) {
      trie.add(['a:b:c:d', 'a:c:c:d']);
      expect(trie.get()).to.eql({ a: { b: { c: { d: { '*': {} } } }, c: { c: { d: { '*': {} } } } } });
      done();
    });
    it('non-strings get ignored', function(done) {
      trie.add(['a:b:c:d', 'a:c:c:d']);
      var trie1 = shiroTrie.new().add(['a:b:c:d', 4, 'a:c:c:d']);
      expect(trie.get()).to.eql(trie1.get());
      done();
    });
    it('comma-separated permissions', function(done) {
      trie.add('a:b,c:d');
      expect(trie.get()).to.eql({
        a: {
          b: { d: { '*': {} } },
          c: { d: { '*': {} } }
        }
      });
      done();
    });
    it('multiple comma-separated permissions', function(done) {
      trie.add('a:b,c,d:e,f,g');
      expect(trie.get()).to.eql({
        a: {
          b: {
            e: { '*': {} },
            f: { '*': {} },
            g: { '*': {} }
          },
          c: {
            e: { '*': {} },
            f: { '*': {} },
            g: { '*': {} }
          },
          d: {
            e: { '*': {} },
            f: { '*': {} },
            g: { '*': {} }
          }
        }
      });
      done();
    });
    it('reset works', function(done) {
      expect(trie.add('a:b:c').reset().get()).to.eql({});
      done();
    });
  });

  describe('checking permissions', function() {
    beforeEach(function(done) {
      trie = shiroTrie.new();
      done();
    });
    it('simple permission', function(done) {
      trie.add('a:b:c:d');
      expect(trie.check('a:b:c:d')).to.eql(true);
      expect(trie.check('a:c:c:d')).to.eql(false);
      expect(trie.check(1)).to.equal(false);
      done();
    });
    it('star permission', function(done) {
      trie.add('a:*');
      expect(trie.check('a:b')).to.eql(true);
      expect(trie.check('a:b:c')).to.eql(true);
      expect(trie.check('b:c')).to.eql(false);
      expect(trie.check('*')).to.eql(false);
      expect(trie.check('b:*')).to.eql(false);
      expect(trie.check('a:*')).to.eql(true);
      expect(trie.check('a:b:*')).to.eql(true);
      expect(trie.check('a:*:c')).to.eql(true);
      done();
    });
    it('implicit star permission', function(done) {
      trie.add('a');
      expect(trie.check('a:b')).to.eql(true);
      expect(trie.check('a:b:c')).to.eql(true);
      expect(trie.check('b:c')).to.eql(false);
      expect(trie.check('*')).to.eql(false);
      expect(trie.check('b:*')).to.eql(false);
      expect(trie.check('a:*')).to.eql(true);
      expect(trie.check('a:b:*')).to.eql(true);
      expect(trie.check('a:*:c')).to.eql(true);
      done();
    });
    it('comma permission', function(done) {
      trie.add('a:b,c:d');
      expect(trie.check('a:b:d')).to.eql(true);
      expect(trie.check('a:c:d')).to.eql(true);
      done();
    });
  });

  describe('chaining works', function() {
    it('simple add.check', function(done) {
      expect(shiroTrie.new().add('a:b:c').check('a:b:c:d')).to.eql(true);
      done();
    });
  });

  describe('more complex wildcard permissions', function() {

    it('test0', function() {
      assert.equal(shiroTrie.new().add('*').check('l1:l2:l3:l4:l5'), true);
    });
    it('test1', function() {
      assert.equal(shiroTrie.new().add('*').check('l1'), true);
    });
    it('test2', function() {
      assert.equal(shiroTrie.new().add('*:*').check('l1:l2:l3:l4:l5'), true);
    });
    it('test3', function() {
      assert.equal(shiroTrie.new().add('*:*').check('l1:l2'), true);
    });
    it('test4', function() {
      assert.equal(shiroTrie.new().add('*:*').check('l1'), true);
    });
    it('test5', function() {
      assert.equal(shiroTrie.new().add('*:*:*').check('l1:l2:l3:l4:l5'), true);
    });
    it('test6', function() {
      assert.equal(shiroTrie.new().add('*:*:*').check('l1:l2:l3'), true);
    });
    it('test7', function() {
      assert.equal(shiroTrie.new().add('*:*:*').check('l1:l2'), true);
    });
    it('test8', function() {
      assert.equal(shiroTrie.new().add('*:*:*').check('l1'), true);
    });
    it('test9', function() {
      assert.equal(shiroTrie.new().add('newsletter:*:*').check('newsletter:edit'), true);
    });
    it('test10', function() {
      assert.equal(shiroTrie.new().add('newsletter:*:*').check('newsletter:edit:*'), true);
    });
    it('test11', function() {
      assert.equal(shiroTrie.new().add('newsletter:*:*').check('newsletter:edit:12'), true);
    });
  });

  describe('fine grained permissions', function() {
    it('test1', function() {
      assert.equal(shiroTrie.new().add('l1:l2:*').check('l1:l2:l3'), true);
    });
    it('test2', function() {
      assert.equal(shiroTrie.new().add('l1:l2:*').check('l1:l2'), true);
    });
    it('test3', function() {
      assert.equal(shiroTrie.new().add('l1:l2:*:*:*').check('l1:l2:l3:l4:l5'), true);
    });
    it('test4', function() {
      assert.equal(shiroTrie.new().add('l1').check('l1:l2:l3'), true);
    });
    it('test5', function() {
      assert.equal(shiroTrie.new().add('l1:l2').check('l1:l2:l3'), true);
    });
    it('test6', function() {
      assert.equal(shiroTrie.new().add('l1:l2').check('l1'), false);
    });
    it('test7', function() {
      assert.equal(shiroTrie.new().add('l1:a,b,c:l3').check('l1:a:l3'), true);
    });
    it('test8', function() {
      assert.equal(shiroTrie.new().add('l1:a,b,c:d,e,f').check('l1:a:l3'), false);
    });
    it('test9', function() {
      assert.equal(shiroTrie.new().add('l1:a,b,c:d,e,f').check('l1:a:f'), true);
    });
    it('test10', function() {
      assert.equal(shiroTrie.new().add('l1:*:l3').check('l1:l2:l3'), true);
    });
    it('test11', function() {
      assert.equal(shiroTrie.new().add('l1:*:l3').check('l1:l2:error'), false);
    });
    it('test12', function() {
      assert.equal(shiroTrie.new().add('l1:*:l3').check('l1:l2'), false);
    });
    it('test13', function() {
      assert.equal(shiroTrie.new().add('*:l2').check('l1:l2'), true);
    });
    it('test14', function() {
      assert.equal(shiroTrie.new().add('*:l2').check('l1:error'), false);
    });
    it('test15', function() {
      assert.equal(shiroTrie.new().add('*:l2:l3').check('l1:l2:l3'), true);
    });
    it('test16', function() {
      assert.equal(shiroTrie.new().add('*:l2:l3').check('l1:l2:l3:l4'), true);
    });
    it('test17', function() {
      assert.equal(shiroTrie.new().add('*:*:l3').check('l1:l2:l3'), true);
    });
    it('test18', function() {
      assert.equal(shiroTrie.new().add('*:*:l3').check('l1:l2:l3:l4'), true);
    });
    it('test19', function() {
      assert.equal(shiroTrie.new().add('*:*:l3').check('l1:l2:error:l4'), false);
    });
    it('test20', function() {
      assert.equal(shiroTrie.new().add('newsletter:view,create,edit,delete').check('newsletter:view,create,any,edit,delete'), false);
    });
    it('test21', function() {
      assert.equal(shiroTrie.new().add('acc:perm:*').check('acc:perm:x:y:z,1,2'), true);
    });
    it('test22', function() {
      assert.equal(shiroTrie.new().add('acc:perm:x:y:z').check('acc:perm:x:y:z,1,2'), false);
    });
    it('test23', function() {
      assert.equal(shiroTrie.new().add('acc:perm').check('acc:perm:x,a:y:z,1,2'), true);
    });
    it('test24', function() {
      assert.equal(shiroTrie.new().add('acc:perm').check('acc:perm:x,a:*:z,1,2'), true);
    });
    it('test25', function() {
      assert.equal(shiroTrie.new().add('acc:perm:x:y:z').check('acc:perm:x:*:z'), false);
    });
  });

  describe('get Permissions', function() {
    var trie;
    before(function(done) {
      trie = shiroTrie.new();
      trie.add('d:1,2,3:read,write');
      trie.add('d:4:read');
      trie.add('x');
      trie.add('a:1:b:3,4');
      trie.add('a:2:b:5,6');
      trie.add('a:3:b:5,6:9');
      trie.add('z:1,2:y:*');
      trie.add('z:2,3,4:y:x');
      trie.add('z:3,4,5:w:v');
      trie.add('aaa:*');
      done();
    });
    it('simple id lookup with trailing wildcard, but no ? should have no match', function(done) {
        expect(trie.permissions('aaa:*')).to.eql([]);
        done();
    });
    it('simple id lookup', function(done) {
      expect(trie.permissions('d:?')).to.eql(['1', '2', '3', '4']);
      done();
    });
    it('simple id lookup with explicit any', function(done) {
      expect(trie.permissions('d:?:$')).to.eql(['1', '2', '3', '4']);
      done();
    });
    it('simple id lookup with specific sub-right', function(done) {
      expect(trie.permissions('d:?:write')).to.eql(['1', '2', '3']);
      done();
    });
    it('simple id lookup with specific sub-right 2', function(done) {
      expect(trie.permissions('a:?:b')).to.eql(['1', '2', '3']);
      done();
    });
    it('simple id lookup with specific sub-right and any at end', function (done) {
      expect(trie.permissions('a:?:b:$')).to.eql(['1', '2']);
      done();
    });
    it('simple id lookup with specific sub-right and any at end #2', function (done) {
      expect(trie.permissions('z:?:y:$')).to.eql(['1', '2', '3', '4']);
      done();
    });
    it('simple id lookup multiple any at end', function (done) {
      expect(trie.permissions('z:?:$:$')).to.eql(['1', '2', '3', '4', '5']);
      done();
    });
    it('simple id lookup many any at end', function (done) {
      expect(trie.permissions('z:?:$:$:$:$:$')).to.eql(['1', '2', '3', '4', '5']);
      done();
    });
    it('explicit lookup at end', function(done) {
      expect(trie.permissions('d:2:?')).to.eql(['read', 'write']);
      expect(trie.permissions('d:4:?')).to.eql(['read']);
      done();
    });
    it('wildcard lookup at end', function(done) {
      expect(trie.permissions('x:?')).to.eql(['*']);
      done();
    });
    it('any flag in middle', function(done) {
      expect(trie.permissions('a:$:b:?')).to.eql(['3', '4', '5', '6']);
      done();
    });
    it('multiple any flags', function(done) {
      expect(trie.permissions('$:$:?')).to.eql(['read', 'write', '*', 'b', 'y', 'w']);
      done();
    });
    it('wildcard', function(done) {
      expect(trie.permissions('x:$:b:?')).to.eql(['*']);
      done();
    });
    it('no string given', function(done) {
      expect(trie.permissions()).to.eql([]);
      done();
    });
    it('illegal string given', function(done) {
      expect(trie.permissions(':')).to.eql([]);
      done();
    });
    it('no tree', function(done) {
      expect(shiroTrie.new().permissions('a:b')).to.eql([]);
      done();
    });
  });

  describe('get wildcard Permissions and perform checks with implies', function() {
      var trie;
      before(function(done) {
          trie = shiroTrie.new();
          trie.add('item:$:read,write', 'item:7:read', 'other:*:*', 'test:1:update', 'test:2:read,delete');
          trie.addImplies('delete', ['update', 'read']);
          trie.addImplies('update', ['read']);
          done();
      });
      it('simple position lookup', function(done) {
          expect(trie.permissions('item:?')).to.eql(['7', '$']);
          done();
      });
      it('simple position lookup with trailing parts', function(done) {
          expect(trie.permissions('item:?:write')).to.eql(['$']);
          expect(trie.permissions('item:?:read')).to.eql(['7', '$']);
          done();
      });
      it('lookup with both non-expanding and expanding permission', function(done) {
          expect(trie.permissions('other:?:*')).to.eql(['*']);
          done();
      });
      it('lookup with both non-expanding and expanding permission and specific item', function(done) {
          expect(trie.permissions('other:5:*')).to.eql([]);
          done();
      });
      it('verify expansion with non-expanding perm leaf', function(done) {
          expect(trie.permissions('test:2:?')).to.eql(['read', 'delete', 'update']);
          done();
      });
      it('verify update implies read', function(done) {
          expect(trie.permissions('test:1:?')).to.eql(['update', 'read']);
          done();
      });
      // CHECKS
      it('checking perms with both non-expanding and expanding permission and specific item', function(done) {
          expect(trie.check('other:5:*')).to.eql(true);
          done();
      });
      it('check that *:* ending param matches', function(done) {
          expect(trie.check('other:10:read')).to.eql(true);
          done();
      });
      it('check that *:* ending param matches with wildcard', function(done) {
          expect(trie.check('other:10:*')).to.eql(true);
          done();
      });
      it('check that *:* matches with any and wildcard', function(done) {
          expect(trie.check('other:$:*')).to.eql(true);
          done();
      });
  });

  describe('get wildcard Permissions and perform checks with implies 2', function() {
      var trie;
      before(function (done) {
        trie = shiroTrie.new();
        trie.add('*:bleh:*:read');
        trie.add('*:blah:*:update');
        trie.add('*:project:9:basic:read');
        trie.add('1:project:5:*:write');
        trie.add('4:project:*:basic:*');
        // $:project:?:$:*
        trie.addImplies('delete', ['update', 'read']);
        trie.addImplies('update', ['read']);
        done();
      });

      it('verify that * matches * / $', function(done) {
          expect(trie.check('*:bleh:*:read')).to.eql(true);
          done();
      });
      it('verify that * matches * / $', function(done) {
          expect(trie.check('$:bleh:$:read')).to.eql(true);
          done();
      });
      it('verify that * matches * / $ with implies', function(done) {
          expect(trie.check('*:blah:*:read')).to.eql(true);
          done();
      });
      it('verify direct match with implies', function(done) {
          expect(trie.check('$:blah:$:read')).to.eql(true);
          done();
      });

      it('verify delete does not match with wildcards and implies', function(done) {
          expect(trie.check('$:blah:$:delete')).to.eql(false);
          done();
      });

      it('verify that we match ', function(done) {
          expect(trie.permissions('$:project:?:$:$')).to.eql(['5', '*', '9']);
          done();
      });
      it('verify * in check does not match anything in perm', function(done) {
          expect(trie.permissions('$:project:?:$:*')).to.eql(['*']);
          done();
      });
  });

  describe('get wildcard Permissions and perform checks with implies 3', function() {
    var trie;
    before(function (done) {
      trie = shiroTrie.new();
      trie.add('*:organization:*:basic:read');
      trie.add('*:project:*:basic:read');
      trie.addImplies('delete', ['update', 'read']);
      trie.addImplies('update', ['read']);
      done();
    });

    it('test1', function(done) {
      expect(trie.permissions('$:organization:?:basic:read')).to.eql(['*']);
      done();
    });

    it('test2', function(done) {
      expect(trie.permissions('$:organization:?:*:read')).to.eql([]);
      done();
    });

    it('test3', function(done) {
      expect(trie.permissions('$:organization:*:*:create')).to.eql([]);
      done();
    });

    it('test4', function(done) {
      expect(trie.permissions('$:organization:?:*:update')).to.eql([]);
      done();
    });

    it('test5', function(done) {
      expect(trie.permissions('$:organization:?:*:delete')).to.eql([]);
      done();
    });
  });

  describe('expand function', function() {
  it('test1', function() {
    expect(shiroTrie._expand('x:a,b')).to.eql(['x:a', 'x:b']);
  });
  it('test2', function() {
    expect(shiroTrie._expand('x,y:a,b')).to.eql(['x:a', 'y:a', 'x:b', 'y:b']);
  });
  it('test3', function() {
    expect(shiroTrie._expand('x:a,b,c')).to.eql(['x:a', 'x:b', 'x:c']);
  });
  it('test4', function() {
    expect(shiroTrie._expand('x:a,b,c:d')).to.eql(['x:a:d', 'x:b:d', 'x:c:d']);
  });
  it('test5', function() {
    expect(shiroTrie._expand('x,y:a,b,c:1,2')).to.eql(['x:a:1', 'y:a:1', 'x:b:1', 'y:b:1', 'x:c:1', 'y:c:1', 'x:a:2', 'y:a:2', 'x:b:2', 'y:b:2', 'x:c:2', 'y:c:2']);
  });
  it('test6', function() {
    expect(shiroTrie._expand('x,y:a')).to.eql(['x:a', 'y:a']);
  });
  it('test7', function() {
    expect(shiroTrie._expand('x:y')).to.eql(['x:y']);
  });
});
  
});
