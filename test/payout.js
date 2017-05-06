let expect = require("expect");
let payout = require("../lib/payout");

describe("payouts", function() {
  beforeEach(() => {});

  it("should have unit test!", function() {
    expect(true).toBe(true);
  });

  describe("calculatePayeeAmounts", function() {
    it("should work when the amounts are even", async function() {
      let packagePays = [
        { package_name: "leftpad", pay: ["abc", "123"], count: 2 },
        { package_name: "rightpad", pay: ["abc", "def"], count: 1 },
        { package_name: "uppad", pay: ["def", "456"], count: 1 }
      ];
      let total = 4000;

      let outputs = payout.calculatePayeeAmounts(total, packagePays, {
        validate: false
      });

      expect(outputs["123"]).toBe(1000);
      expect(outputs["456"]).toBe(500);
      expect(outputs["abc"]).toBe(1500);
      expect(outputs["def"]).toBe(1000);
      expect(outputs["_dust"]).toBe(0);
    });

    it("should work when the amounts are irregular", async function() {
      let packagePays = [
        { package_name: "leftpad", pay: ["abc", "123"], count: 39 },
        { package_name: "rightpad", pay: ["abc", "def"], count: 8 },
        { package_name: "uppad", pay: ["456"], count: 20 }
      ];
      let total = 213973;

      let outputs = payout.calculatePayeeAmounts(total, packagePays, {
        validate: false
      });
      expect(outputs["123"]).toBe(62275);
      expect(outputs["456"]).toBe(63872);
      expect(outputs["abc"]).toBe(75049);
      expect(outputs["def"]).toBe(12774);
      expect(outputs["_dust"]).toBe(3);
    });

    it("should fail when the total is too low", async function() {
      let packagePays = [
        { package_name: "leftpad", pay: ["abc", "123"], count: 39 },
        { package_name: "rightpad", pay: ["abc", "def"], count: 8 },
        { package_name: "uppad", pay: ["456"], count: 20 }
      ];
      let total = 3;

      expect(function() {
        payout.calculatePayeeAmounts(total, packagePays, { validate: false });
      }).toThrow(/Can't payout fewer/);
    });

    it("should have a good answer for this situation", async function() {
      let packagePays = [
        { package_name: "leftpad", pay: ["abc", "123"], count: 39 },
        { package_name: "rightpad", pay: ["abc", "def"], count: 8 },
        { package_name: "uppad", pay: ["456"], count: 20 }
      ];
      let total = 4;

      let outputs = payout.calculatePayeeAmounts(total, packagePays, {
        validate: false
      });
      expect(outputs["abc"]).toBe(1);
      expect(outputs["123"]).toBe(1);
      expect(outputs["456"]).toBe(1);

      // this is an interesting case
      // on the one hand, it's fine because def is a relatively small proportion
      // of the installs relative to the amount of satoshis.  on the other hand,
      // it feels a little off giving it to dust instead of def
      expect(outputs["def"]).toBe(0);
      expect(outputs["_dust"]).toBe(1);
    });

  });
});
