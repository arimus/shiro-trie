'use strict';

function uniq(arr) {
  var u = {}, a = [];
  for (var i = 0, l = arr.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(u, arr[i])) {
      continue;
    }
    a.push(arr[i]);
    u[arr[i]] = 1;
  }
  return a;
}

function _add(trie, array) {
  var i, j, node, prevNode, values, goRecursive;
  node = trie;
  goRecursive = false;
  // go through permission string array
  for (i = 0; i < array.length; i++) {
    // split by comma
    values = array[i].split(',');
    // default: only once (no comma separation)
    for (j = 0; j < values.length; j++) {
      // permission is new -> create
      if (!node.hasOwnProperty(values[j])) {
        node[values[j]] = {};
      }
      if (values.length > 1) {
        // if we have a comma separated permission list, we have to go recursive
        // save the remaining permission array (subTrie has to be appended to each one)
        goRecursive = goRecursive || array.slice(i + 1);
        // call recursion for this subTrie
        node[values[j]] = _add(node[values[j]], goRecursive);
        // break outer loop
        i = array.length;
      } else {
        // if we don't need recursion, we just go deeper
        prevNode = node;
        node = node[values[j]];
      }
    }
  }
  // if we did not went recursive, we close the Trie with a * leaf
  if (!goRecursive && (!prevNode || !prevNode.hasOwnProperty('*'))) {
    node['*'] = {};
  }
  return trie;
}

function _check(trie, implies, impliedBy, array, indent, implicitWildcard) {
  log(indent, '_check');
  if (indent == null) {
    indent = 0;
  }
  if (implicitWildcard == null) {
    implicitWildcard = true;
  }
  log(indent, '_check', array, 'against keys', Object.keys(trie));
  var i, j, node;
  node = trie;
  // add implicit star at the end
  if ((array.length < 1 || array[array.length - 1] !== '*') && implicitWildcard) {
    array.push('*');
  }

  // break down each item in the perm a:b:c:d
  for (i = 0; i < array.length; i++) {
    log(indent, '_check', 'checking', array[i], 'against keys', Object.keys(node));

    // if we find a */$, then we have a match and have to dig deeper
    if (node.hasOwnProperty('*')) {
      log(indent, '_check', '**** found * in trie');
      // if we find a star leaf in the trie, we are done (everything below is allowed)
      if (Object.keys(node['*']).length === 0) {
          log(indent, '_check', '* is a leaf, returning true');
          return true;
      }
      // otherwise we have to go deeper
      // log(indent, '_check', 'setting next node keys to', Object.keys(node['*']));
      // node = node['*'];
      // continue;
      var a = array.slice(i + 1);
      log(indent, '_check', 'drilling into keys', Object.keys(node['*']), 'checking', a);
      var res = _check(node['*'], implies, impliedBy, a, indent + 1);
      if (res) {
          log(indent, '_check', 'results under *', res);
          return true;
      }
      log(indent, '_check', '* match did not pan out, continuing');
      // check for a $ match first - a:b:c:d in $:b:c:d
    }

    if (node.hasOwnProperty('$')) {
      // we found a non-expanding star leaf, allow this level and continue
      log(indent, '_check', 'found $');
      var a = array.slice(i + 1);
      // log(indent, '_check', 'setting next node keys to', Object.keys(node['$']), 'checking', a);
      var res = _check(node['$'], implies, impliedBy, a, indent + 1);
      if (res) {
        log(indent, '_check', 'results under $', res);
        return true;
      }
      log(indent, '_check', '$ matched but no sub-match, continuing');
    }

    // given perms: $:1:1:1, b:$:2:2
    // checking for b:1:2:2
    // for each perm in the trie
    //   for each character in perm
    //     ITER1
    //       check b against $ - true
    //       check 1 against 1 - true
    //       check 2 against 1 - false
    //     ITER2
    //       check b against b - true
    //       check 1 against $ - true
    //       check 2 against 2 - true
    //       check 2 against 2 - true

    // if the wanted permission is not found, we return false
    log(indent, '_check', 'checking for', array[i], 'in keys', Object.keys(node));

    var keysWithImplies = _processImplies(Object.keys(node), implies, indent)
    log(indent, '_check', 'expanding with implies', keysWithImplies);

    // if (!node.hasOwnProperty(array[i]) && array[i] !== '$' && array[i] !== '*') {
    if (keysWithImplies.indexOf(array[i]) === -1 && array[i] !== '$' && array[i] !== '*') {
      log(indent, '_check', 'no match for', array[i]);
      return false;
    } else if (!node.hasOwnProperty(array[i]) && array[i] === '*') {
      log(indent, '_check', 'no match for *', array[i]);
      return false;
    } else if (array[i] === '$') {
      log(indent, '_check', 'checking for $');
      // perform full checks just below this level
      // $ can match on of many permissions in the trie, we need to loop through each path
      var keys = Object.keys(node);
      for (j = 0; j < keys.length; j++) {
          var key = keys[j];
          var subNode = node[key];
          // now check the sub-node against what's left in the array
          var res = _check(subNode, implies, impliedBy, array.splice(i + 1), indent + 1);
          if (res) {
              log(indent, '_check', '**** found match for $', array[i]);
              return true;
          }
      }
      log(indent, '_check', 'no match for $', array[i]);
      return false;
    }

    // otherwise we go deeper
    log(indent, '_check', '**** found match at this level for', array[i], 'in', Object.keys(node));

    // check implied by and loop through until we find what we need
    var a = impliedBy[array[i]];
    if (!!a && a.length > 0) {
      for (j = 0; j < a.length; j++) {
        var key = a[j];
        log(indent, '_check', 'have implies, checking for key', key, 'in', Object.keys(node));
        var subNode = node[key];
        if (!!subNode) {
          // now check the sub-node against what's left in the array
          var res = _check(subNode, implies, impliedBy, array.slice(i + 1), indent + 1);
          if (res) {
            log(indent, '_check', '**** found match for $', array[i]);
            return true;
          }
        }
      }
    }

    log(indent, '_check', 'setting next node for', array[i], 'to', Object.keys(node[array[i]]));
    node = node[array[i]];
  }

  // word (array) was found in the trie. all good!
  return true;
}

function _permissions(trie, array, implies, impliedBy, indent) {
  if (indent == null) {
    indent = 0;
    log(indent, '_permissions checking', array, 'against trie', JSON.stringify(trie, null, 4));
  } else {
    log(indent, '_permissions checking', array, 'against keys', Object.keys(trie));
  }
  var current, results = [];
  if (!trie || !array || typeof trie !== 'object' || !Array.isArray(array) || Object.keys(trie).length < 1 || array.length < 1) {
      // for recursion safety, we make sure we have really valid values
      log(indent, '_permissions current=', current, 'bailing...');
      return [];
  }
  array = [].concat(array);

  // *:bleh:*:read
  // *:blah:*:update
  // *:project:9:basic:read
  // 1:project:5:*:write
  // 4:project:*
  //
  // check: $,project,?,$,*
  // current = first item in list

  // take first element from array
  current = array.shift();

  // checking current against current level keys *,1,4

  // if current == $ then
  //   we have $, so we match everything at this level...loop
  //   results = []
  //   forEach keys {
  //     r = recurse project,?,$,* against node[key]
  //     add r to matches
  //   }
  //   return matches
  // end

  // if we have an 'any' flag, we have to go recursive for all alternatives
  if (current === '$') { // $ before ?
    log(indent, '_permissions current=', current);
    Object.keys(trie).forEach(function concatPermissions(key) {
      log(indent, '_permissions current=', current, 'checking trie for key', key, 'trie', JSON.stringify(trie[key], null, 4));
      // if we are at the end of our current trie branch
      if (Object.keys(trie[key]).length === 0) {
        log(indent, '_permissions current=', current, 'we hit the end of the trie, adding *');
        results.push('*');
      // else dig deeper
      } else {
        log(indent, '_permissions current=', current, 'dig further into the trie');
        results = results.concat(_permissions(trie[key], [].concat(array), implies, impliedBy, indent + 1));
        log(indent, '_permissions current=', current, 'concat results for', key, results);
      }
    });
    // remove duplicates
    var u = uniq(results);
    // … and * from results
    // for (var i = u.length - 1; i >= 0; i--) {
    //   //if (u[i] === '*') {
    //   //  u.splice(i, 1);
    //   //}
    // }
    log(indent, '_permissions current=', current, 'results3: ', u);
    return u;
  }

  // if current == ? then
  //   forEach keys {
  //     check to see if the rest of the check matches and if so, add this key to the matches
  //   }
  //   return matches
  // end

  // the requested part
  if (current === '?') {
    results = Object.keys(trie);
    log(indent, '_permissions current=', current, 'keys in trie', results);
    // if something is coming after the ?,
    if (array.length > 0) {
      var anyObj = {};
      var matchingNodes = [];
      results.forEach(function (node) {
        // check to see if the rest of this path in the trie matches
        log(indent, '_permissions current=', current, 'checking ? match for key', node, 'check', array, 'trie', JSON.stringify(trie[node], null, 4));
        var m = _check(trie[node], implies, impliedBy, [].concat(array), indent + 1, false);
        if (m) {
          log(indent, '_permissions current=', current, 'matched');
          matchingNodes = matchingNodes.concat(node);
        } else {
          log(indent, '_permissions current=', current, 'not matched');
        }

        anyObj[node] = _expandTrie(trie[node], array);
      });

      var res = results.filter(function (node) {
        log(indent, '_permissions current=', current, 'filtering ? nodes', node, matchingNodes, anyObj[node].length > 0, matchingNodes.indexOf(node) !== -1);
        return anyObj[node].length > 0 && matchingNodes.indexOf(node) !== -1;
      });

      log(indent, '_permissions current=', current, 'returning ? expanded results after processing implies for', res);
      return _processImplies(res, implies, indent);
    }
    log(indent, '_permissions current=', current, 'returning ? results after processing implies for', results);
    return _processImplies(results, implies, indent);
  }

  // explicit matches
  if (trie.hasOwnProperty(current)) {
    log(indent, '_permissions current=', current, 'found match', current);
    // we have to go deeper! and we may have other results from above, so concat
    results = results.concat(_permissions(trie[current], array, implies, impliedBy));
    log(indent, '_permissions current=', current, 'res3', results);
    return results;
  }

  log(indent, '_permissions current=', current, 'results5: ', []);
  return results;
}

function _processImplies(res, implies, indent) {
  if (indent == null) {
    indent = 0;
  }
  log(indent, 'processing implies', res, JSON.stringify(implies, null, 4));
  var resultsWithImplies = [];
  // expand these results
  for (var i=0; i < res.length; i++) {
    // push the original item
    resultsWithImplies.push(res[i]);

    // push any implies
    log(indent, 'checking for expansions:', res[i]);
    var l = implies[res[i]];
    if (!!l && l.length > 0) {
        resultsWithImplies = resultsWithImplies.concat(l);
    }
  }
  log(indent, 'results with implies: ', resultsWithImplies);
  return uniq(resultsWithImplies);
}

function _expand(permission) {
  var results = [];
  var parts = permission.split(':');
  var i, alternatives;
  for (i = 0; i < parts.length; i++) {
    alternatives = parts[i].split(',');
    if (results.length === 0) {
      results = alternatives;
    } else {
      alternatives = alternatives.map(function(alternative) {
        return results.map(function(perm) {
          return perm + ':' + alternative;
        }, this);
      }, this);
      results = [].concat.apply([], uniq(alternatives));
    }
  }
  log(0, '_expand', permission, results);
  return results;
}

function _expandTrie(trie, array) {
  var a = [].concat(array);

  return Object.keys(trie).map(function (node) {
    if (node === '*') {
      return [node];
    }
    if (array[0] === node || array[0] === '$') {
      if (array.length <= 1) {
        return [node];
      }
      var child = _expandTrie(trie[node], array.slice(1));
      return child.map(function (inner) {
        return node + ':' + inner;
      });
    }
    return [];
  }).reduce(function (a, b) {
    return a.concat(b);
  }, []);
}

/**
 * Retuns a new ShiroTrie instance
 * @returns {ShiroTrie}
 * @constructor
 */
var ShiroTrie = function () {
  this.data = {};
  this.impliedBy = {};
  this.implies = {};
  return this;
};

/**
 * removes all data from the Trie (clean startup)
 * @returns {ShiroTrie}
 */
ShiroTrie.prototype.reset = function () {
  this.data = {};
  this.impliedBy = {};
  this.implies = {};
  return this;
};

/**
 * Add one or more permissions to the Trie
 * @param {...string|...Array} args - Any number of permission string(s) or String Array(s)
 * @returns {ShiroTrie}
 */
ShiroTrie.prototype.add = function () {
  var args = [].concat.apply([], arguments);
  var arg;
  for (arg in args) {
    if (args.hasOwnProperty(arg) && typeof(args[arg]) === 'string') {
      this.data = _add(this.data, args[arg].split(':'));
    }
  }
  return this;
};

/**
 * Add one or more permission implications to the Trie. Example: 'delete' implies ['update', 'read']
 * @param perm - The perm part that implies other perm parts
 * @param implies - The array of perm parts implied
 * @returns {ShiroTrie}
 */
ShiroTrie.prototype.addImplies = function (perm, implies) {
  if (typeof perm !== 'string' || !Array.isArray(implies)) {
    return false;
  }

  // save this for later expansion
  this.implies[perm] = implies;

  // index this in reverse order for lookups, delete implies update / read should result in:
  // {
  //   read: ['delete'],
  //   update: ['delete']
  // }
  for (var i=0; i < implies.length; i++) {
    if (!this.impliedBy[implies[i]]) {
      this.impliedBy[implies[i]] = [];
    }
    this.impliedBy[implies[i]].push(perm);
  }
  return this;
};

/**
 * check if a specific permission is allowed in the current Trie.
 * @param string The string to check. Should not contain * – always check for the most explicit permission
 * @returns {*}
 */
ShiroTrie.prototype.check = function (string) {
  if (typeof string !== 'string') {
    return false;
  }
  if (string.indexOf(',') !== -1) { // expand string to single comma-less permissions...
    return _expand(string).map(function (permission) {
      return _check(this.data, this.implies, this.impliedBy, permission.split(':'));
    }, this).every(Boolean); // ... and make sure they are all allowed
  }
  log(0, 'check', string, 'in', this.data);
  return _check(this.data, this.implies, this.impliedBy, string.split(':'));
};

/**
 * return the Trie data
 * @returns {{}|*}
 */
ShiroTrie.prototype.get = function () {
  return this.data;
};

/**
 * check what permissions a certain Trie part contains
 * @param string String to check – should contain exactly one ?. Also possible is usage of the any ($) parameter. See
 *   docs for details.
 * @returns {*}
 */
ShiroTrie.prototype.permissions = function (string) {
  if (typeof string !== 'string') {
    return [];
  }
  var res = _permissions(this.data, string.split(':'), this.implies, this.impliedBy);
  log(0, 'test', res);
  return res;
};

function log() {
  if (!!process && !!process.env && process.env.SHIROTRIE_DEBUG === 'true') {
    var s = '';
    for (var i=0; i < arguments[0]; i++) {
      s += '    ';
    }
    for (var i=1; i < arguments.length; i++) {
      s += arguments[i] + ' ';
    }
    console.log(s);
  }
}

module.exports = {
  new: function () {
    return new ShiroTrie();
  },
  _expand: _expand,
};
