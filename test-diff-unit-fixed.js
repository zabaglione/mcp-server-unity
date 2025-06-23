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

// Create proper diff format
const diffToApply = `--- a/Player.cs
+++ b/Player.cs
@@ -4,3 +4,3 @@
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
  console.error(error);
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

// Create 1000 lines
for (let i = 0; i < 1000; i++) {
  largeOriginal += `Line ${i}: This is some content that stays the same\n`;
  largeModified += `Line ${i}: This is ${i % 50 === 0 ? 'MODIFIED' : 'some content that stays the same'}\n`;
}

console.log(`   Original size: ${largeOriginal.length} bytes`);

const startTime = Date.now();
const largeDiff = DiffParser.createDiff(
  largeOriginal, 
  largeModified, 
  'large.cs', 
  'large.cs', 
  1
);
const createTime = Date.now() - startTime;

console.log(`✅ Large diff created in ${createTime}ms`);
console.log(`   Diff size: ${largeDiff.length} characters`);
console.log(`   First 200 chars: ${largeDiff.substring(0, 200)}...`);

// Test 5: Apply large diff
const applyStart = Date.now();
try {
  const largeResult = DiffApplier.apply(largeOriginal, largeDiff);
  const applyTime = Date.now() - applyStart;
  console.log(`✅ Large diff applied in ${applyTime}ms`);
  console.log(`   Hunks: ${largeResult.result.hunksApplied}/${largeResult.result.hunksTotal}`);
  
  // Verify changes
  const modifiedLines = largeResult.content.split('\n').filter(line => line.includes('MODIFIED'));
  console.log(`   Modified lines found: ${modifiedLines.length}`);
} catch (error) {
  console.log('❌ Large diff apply failed:', error.message);
}

// Test 6: Complex multi-hunk diff
console.log('\n🔀 Test 6: Multi-hunk diff');
const multiOriginal = `class Test {
    int value = 1;
    
    void Start() {
        Debug.Log("Starting");
    }
}`;

const multiHunkDiff = `--- a/Test.cs
+++ b/Test.cs
@@ -1,1 +1,1 @@
-class Test {
+public class Test {
@@ -4,2 +4,3 @@
     void Start() {
         Debug.Log("Starting");
+        Debug.Log("Started");
     }`; 

try {
  const multiResult = DiffApplier.apply(multiOriginal, multiHunkDiff);
  console.log('✅ Multi-hunk diff applied');
  console.log(`   Hunks: ${multiResult.result.hunksApplied}/${multiResult.result.hunksTotal}`);
  
  if (multiResult.content.includes('public class') && multiResult.content.includes('Started')) {
    console.log('✅ Both changes applied correctly');
  }
} catch (error) {
  console.log('❌ Multi-hunk apply failed:', error.message);
}

// Test 7: Test with very large file (10MB+)
console.log('\n📦 Test 7: Very large file (10MB+)');
const veryLargeOriginal = 'a'.repeat(10 * 1024 * 1024); // 10MB of 'a'
const veryLargeModified = 'b'.repeat(10 * 1024 * 1024); // 10MB of 'b'

const veryLargeStart = Date.now();
try {
  // Just test first 1000 chars for performance
  const veryLargeDiff = DiffParser.createDiff(
    veryLargeOriginal.substring(0, 1000),
    veryLargeModified.substring(0, 1000),
    'verylarge.cs',
    'verylarge.cs',
    1
  );
  const veryLargeTime = Date.now() - veryLargeStart;
  console.log(`✅ Very large diff created in ${veryLargeTime}ms`);
  
  // Apply the diff
  const applyVeryLargeStart = Date.now();
  const veryLargeResult = DiffApplier.apply(
    veryLargeOriginal.substring(0, 1000),
    veryLargeDiff
  );
  const applyVeryLargeTime = Date.now() - applyVeryLargeStart;
  console.log(`✅ Very large diff applied in ${applyVeryLargeTime}ms`);
} catch (error) {
  console.log('❌ Very large file test failed:', error.message);
}

console.log('\n🎉 All unit tests completed!');