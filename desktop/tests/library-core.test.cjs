const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cleanUrl,cleanLibraryTitle,normalizeLibrary,addHistory,toggleBookmark,MAX_BOOKMARKS,MAX_HISTORY}=require('../library-core');

test('library accepts HTTPS only',()=>{
  assert.equal(cleanUrl('https://example.com/a'),'https://example.com/a');
  assert.equal(cleanUrl('http://example.com'),null);
  assert.equal(cleanUrl('file:///C:/x'),null);
  assert.equal(cleanUrl('javascript:alert(1)'),null);
});
test('titles are normalized and bounded',()=>{
  assert.equal(cleanLibraryTitle('  A\n\t B  '),'A B');
  assert.equal(cleanLibraryTitle('x'.repeat(500)).length,120);
});
test('history deduplicates consecutive same URL and keeps newest title/time',()=>{
  let history=[];
  history=addHistory(history,{id:'h1',url:'https://example.com/',title:'Old',visitedAt:1});
  history=addHistory(history,{id:'h2',url:'https://example.com/',title:'New',visitedAt:2});
  assert.equal(history.length,1);assert.equal(history[0].title,'New');assert.equal(history[0].visitedAt,2);
});
test('bookmark toggle adds then removes same URL',()=>{
  let bookmarks=[];
  let result=toggleBookmark(bookmarks,{id:'b1',url:'https://example.com/',title:'Example',createdAt:1});
  assert.equal(result.added,true);assert.equal(result.bookmarks.length,1);
  result=toggleBookmark(result.bookmarks,{id:'b2',url:'https://example.com/',title:'Example',createdAt:2});
  assert.equal(result.added,false);assert.equal(result.bookmarks.length,0);
});
test('normalization rejects unsafe entries and enforces limits',()=>{
  const raw={bookmarks:[{id:'bad',url:'file:///x',title:'bad'},...Array.from({length:MAX_BOOKMARKS+5},(_,i)=>({id:`b${i}`,url:`https://b${i}.example/`,title:`B${i}`}))],history:[{id:'bad',url:'javascript:1',title:'bad'},...Array.from({length:MAX_HISTORY+5},(_,i)=>({id:`h${i}`,url:`https://h${i}.example/`,title:`H${i}`}))]};
  const data=normalizeLibrary(raw);assert.equal(data.bookmarks.length,MAX_BOOKMARKS);assert.equal(data.history.length,MAX_HISTORY);assert.ok(data.bookmarks.every(x=>x.url.startsWith('https://')));assert.ok(data.history.every(x=>x.url.startsWith('https://')));
});
