const fs = require("fs");
const sample1 = fs.readFileSync("sample.txt", "utf-8");
const sample2 = fs.readFileSync("sample2 copy.txt", "utf-8");

// const arr1 = sample1.split("\n\n␟\n\n");
const arr1 = sample1
  .replaceAll("␟", "")
  .replaceAll("\r", "")
  .split("\n")
  .filter((elem) => {
    return elem.trim().length !== 0;
  });

// const arr2 = sample2.split("\n\n␟\n\n");
const arr2 = sample2
  .replaceAll("␟", "")
  .replaceAll("\r", "")
  .split("\n")
  .filter((elem) => {
    return elem.trim().length !== 0;
  });
console.log(arr1);

console.log(`sample.txt 배열 길이: ${arr1.length}`);
console.log(`sample2.txt 배열 길이: ${arr2.length}`);
// console.log(sample1.slice(0, 100));
// console.log(sample2.slice(0, 100));
console.log(`차이: ${Math.abs(arr1.length - arr2.length)}`);
