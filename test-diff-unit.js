#!/usr/bin/env node

// Unit test for diff functionality without Unity connection
import { DiffParser } from './build/diff/parser.js';
import { DiffApplier } from './build/diff/applier.js';

console.log('🧪 Diff Engine Unit Tests\n');

// Test 1: Parse simple diff
console.log('📊 Test 1: Parsing simple diff');
const simpleDiff = `--- a/test.cs
+++ b/test.cs
@@ -10,3 +10,3 @@
     private int health = 100;
-    private float speed = 5f;
+    private float speed = 10f;
     private bool isAlive = true;`;

try {
  const parsed = DiffParser.parse(simpleDiff);
  console.log('✅ Parsed successfully');
  console.log(`   Files: ${parsed.length}`);
  console.log(`   Hunks: ${parsed[0].hunks.length}`);
  console.log(`   Lines changed: ${parsed[0].hunks[0].lines.length}`);
} catch (error) {
  console.log('❌ Parse failed:', error.message);
}

// Test 2: Apply diff
console.log('\n📝 Test 2: Applying diff');
const originalContent = `using UnityEngine;

public class Player : MonoBehaviour {
    private int health = 100;
    private float speed = 5f;
    private bool isAlive = true;
    
    void Start() {
        Debug.Log("Player started");
    }
}`;

const diffToApply = `@@ -4,3 +4,3 @@
     private int health = 100;
-    private float speed = 5f;
+    private float speed = 10f;
     private bool isAlive = true;`;

try {
  const result = DiffApplier.apply(originalContent, diffToApply);
  console.log('✅ Applied successfully');
  console.log(`   Hunks applied: ${result.result.hunksApplied}/${result.result.hunksTotal}`);
  console.log(`   Success: ${result.result.success}`);
  
  if (result.content.includes('speed = 10f')) {
    console.log('✅ Content updated correctly');
  } else {
    console.log('❌ Content not updated');
  }
} catch (error) {
  console.log('❌ Apply failed:', error.message);
}

// Test 3: Create diff
console.log('\n🔧 Test 3: Creating diff');
const original = `class Test {
    int value = 1;
    string name = "test";
}`;

const modified = `class Test {
    int value = 2;
    string name = "modified";
    bool active = true;
}`;

const createdDiff = DiffParser.createDiff(original, modified, 'test.cs', 'test.cs', 2);
console.log('✅ Diff created:');
console.log(createdDiff);

// Test 4: Large file performance
console.log('\n📏 Test 4: Large file handling');
let largeOriginal = '';
let largeModified = '';

for (let i = 0; i < 10000; i++) {
  largeOriginal += `Line ${i}: This is some content\n`;
  largeModified += `Line ${i}: This is ${i % 100 === 0 ? 'modified' : 'some'} content\n`;
}

const startTime = Date.now();
const largeDiff = DiffParser.createDiff(
  largeOriginal.substring(0, 5000), 
  largeModified.substring(0, 5000), 
  'large.cs', 
  'large.cs', 
  1
);
const createTime = Date.now() - startTime;

console.log(`✅ Large diff created in ${createTime}ms`);
console.log(`   Size: ${largeDiff.length} characters`);

// Test 5: Apply large diff
const applyStart = Date.now();
try {
  const largeResult = DiffApplier.apply(largeOriginal, largeDiff);
  const applyTime = Date.now() - applyStart;
  console.log(`✅ Large diff applied in ${applyTime}ms`);
  console.log(`   Hunks: ${largeResult.result.hunksApplied}/${largeResult.result.hunksTotal}`);
} catch (error) {
  console.log('❌ Large diff apply failed:', error.message);
}

// Test 6: Complex multi-hunk diff
console.log('\n🔀 Test 6: Multi-hunk diff');
const multiHunkDiff = `@@ -1,3 +1,3 @@
-class Test {
+public class Test {
     int value = 1;
@@ -5,3 +5,4 @@
     }
+    public void Update() { }
 }`; 

const multiOriginal = `class Test {
    int value = 1;
    
    void Start() {
    }
}`;

try {
  const multiResult = DiffApplier.apply(multiOriginal, multiHunkDiff);
  console.log('✅ Multi-hunk diff applied');
  console.log(`   Hunks: ${multiResult.result.hunksApplied}/${multiResult.result.hunksTotal}`);
} catch (error) {
  console.log('❌ Multi-hunk apply failed:', error.message);
}

// Test 7: Fuzzy matching
console.log('\n🎯 Test 7: Fuzzy matching');
const fuzzyDiff = `@@ -1,3 +1,3 @@
-    private float speed = 5f;
+    private float speed = 10f;`;

const fuzzyOriginal = `    private  float  speed  =  5f;`; // Extra spaces

try {
  const fuzzyResult = DiffApplier.apply(fuzzyOriginal, fuzzyDiff, {
    ignoreWhitespace: true
  });
  console.log('✅ Fuzzy match applied');
  console.log(`   Success: ${fuzzyResult.result.success}`);
} catch (error) {
  console.log('❌ Fuzzy match failed:', error.message);
}

console.log('\n🎉 All unit tests completed!');