import { test, equal } from "@elements/app";
import { parseStack } from "./stack";

test("stack", () => {
  test("parses V8 frames and marks library frames", () => {
    let frames = parseStack("TypeError: x\n    at CartLine.render (https://shop.example.com/assets/cart.js:214:31)\n    at Array.map (<anonymous>)\n    at https://shop.example.com/assets/vendor.js:1:2");

    equal(frames.map((f) => [f.fn, f.file, f.line, f.lib]), [
      ["CartLine.render", "/assets/cart.js", 214, false],
      ["Array.map", "<anonymous>", null, true],
      ["<anonymous>", "/assets/vendor.js", 1, true],
    ]);
  });

  test("parses Safari and Firefox frames", () => {
    let frames = parseStack("canShowWalletPay@https://shop.example.com/checkout.js:88:42\n@https://shop.example.com/main.js:3:1");
    equal(frames.map((f) => [f.fn, f.file, f.line]), [
      ["canShowWalletPay", "/checkout.js", 88],
      ["<anonymous>", "/main.js", 3],
    ]);
  });
});
