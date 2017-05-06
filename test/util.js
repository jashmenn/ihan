let expect = require("expect");
let util = require("../lib/util");

describe("util", function() {
  beforeEach(() => {});

  describe("extractPayees", function() {
    it("should extract payees from pay", async function() {

      let pkg = {
        "name": "leftpad",
        "dist-tags": {
          "latest": "0.0.1"
        },
        "versions": {
          "0.0.1": {
            "name": "leftpad",
            "pay": "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z",
          }
        }
      };

      let payees = util.extractPayees(pkg);
      expect(payees).toContain("1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z");
    });

    it("should extract an array of payees from pay", async function() {
      let pkg = {
        "name": "leftpad",
        "dist-tags": {
          "latest": "0.0.1"
        },
        "versions": {
          "0.0.1": {
            "name": "leftpad",
            "pay": ["1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z", "n2aLDqVDpj5WjwA3XKcRMn39ENP6zhaUyw"],
          }
        }
      };

      let payees = util.extractPayees(pkg);
      expect(payees).toContain("1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z");
      expect(payees).toContain("n2aLDqVDpj5WjwA3XKcRMn39ENP6zhaUyw");
    });

    it("should de-dup", async function() {
      let pkg = {
        "name": "leftpad",
        "dist-tags": {
          "latest": "0.0.1"
        },
        "versions": {
          "0.0.1": {
            "name": "leftpad",
            "pay": ["1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z", "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z"],
          }
        }
      };

      let payees = util.extractPayees(pkg);
      expect(payees).toContain("1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z");
      expect(payees.length).toBe(1);
    });

    it("should extract payees from config", async function() {
      let pkg = {
        "name": "leftpad",
        "dist-tags": {
          "latest": "0.0.1"
        },
        "versions": {
          "0.0.1": {
            "name": "leftpad",
            "config": {
              "pay": "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z",
            }
          }
        }
      };

      let payees = util.extractPayees(pkg);
      expect(payees).toContain("1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z");
    });

    it("should remove invalid payees", async function() {

      let pkg = {
        "name": "leftpad",
        "dist-tags": {
          "latest": "0.0.1"
        },
        "versions": {
          "0.0.1": {
            "name": "leftpad",
            "pay": ["1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z", "not-an-address"],
          }
        }
      };

      let payees = util.extractPayees(pkg);
      expect(payees).toContain("1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z");
      expect(payees.length).toBe(1);
    });

  });

});
