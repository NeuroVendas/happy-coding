'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MAX_QUERY,MAX_RESULTS,cleanSearchQuery,logicalSearchUrl,googleSearchUrl,unwrapGoogleUrl,normalizeGoogleResults,googleBlocked}=require('../search-core');

test('search query is normalized and bounded',()=>{assert.equal(cleanSearchQuery('  hello\n world  '),'hello world');assert.equal(cleanSearchQuery('x'.repeat(MAX_QUERY+20)).length,MAX_QUERY);});
test('logical URL stays inside Happy Coding while Google request forces SafeSearch',()=>{assert.equal(logicalSearchUrl('electron tabs'),'happy://search?q=electron%20tabs');const url=new URL(googleSearchUrl('electron tabs'));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('safe'),'active');assert.equal(url.searchParams.get('q'),'electron tabs');});
test('Google redirects are unwrapped and http results are upgraded',()=>{assert.equal(unwrapGoogleUrl('https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fa'),'https://example.com/a');assert.equal(unwrapGoogleUrl('http://example.com/a'),'https://example.com/a');assert.equal(unwrapGoogleUrl('javascript:alert(1)'),null);});
test('search results are sanitized, unique and bounded',()=>{const raw=Array.from({length:20},(_,i)=>({title:` Result ${i} `,url:i===1?'https://example.com/0':`https://example.com/${i}`,snippet:'  hello\n world  '}));const results=normalizeGoogleResults(raw);assert.equal(results.length,MAX_RESULTS);assert.equal(results[0].host,'example.com');assert.equal(results[0].snippet,'hello world');assert.equal(new Set(results.map(x=>x.url)).size,results.length);});
test('Google consent and anti-bot pages are detected',()=>{assert.equal(googleBlocked({href:'https://consent.google.com/m',bodyText:''}),true);assert.equal(googleBlocked({href:'https://www.google.com/sorry/index',bodyText:'unusual traffic'}),true);assert.equal(googleBlocked({href:'https://www.google.com/search?q=x',bodyText:'normal results'}),false);});
