let expect = require("expect");
let app = require("./server");

describe("installs", function() {
  var db;
  beforeEach(() => {
    db = app.db;
  });

  it("should have unit test!", function() {
    expect(true).toBe(true);
  });

  it("should record installs in the database", async function() {
    await db.recordInstalls([
      {
        package_name: "leftpad",
        package_version: "1.0.0",
        pay: ["abc", "123"]
      },
      {
        package_name: "rightpad",
        package_version: "0.0.1",
        pay: ["abc", "def"]
      }
    ]);

    let install = await db
      .knexDb(db.installsTableName)
      .first()
      .where("package_name", "leftpad");
    expect(install.package_version).toBe("1.0.0");
    expect(install.pay).toInclude("abc");
    expect(install.pay).toInclude("123");
  });
});
