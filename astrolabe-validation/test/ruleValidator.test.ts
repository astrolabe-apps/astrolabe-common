import { describe, expect, test } from "vitest";
import { parseEval, NullExpr, valueExpr, printPath } from "@astroapps/evaluator";
import {
  singleRule,
  multiRule,
  forEachRule,
  withMessage,
  withProp,
  andMust,
  validateData,
  getProperty,
} from "../src";

/**
 * Tests for the validation library, mirroring the .NET Astrolabe.Validation tests.
 */

describe("Basic Comparison Validation", () => {
  test("Simple comparison fails when invalid", () => {
    const data = { value: 5 };
    const rule = singleRule(
      parseEval("value"),
      parseEval("value > 10"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(1);

    // Check failure contents
    const failure = results[0].failures[0];
    expect(failure.call.function).toBe(">");
    expect(failure.evaluatedArgs).toHaveLength(2);
    expect(failure.evaluatedArgs[0].value).toBe(5);
    expect(failure.evaluatedArgs[1].value).toBe(10);
  });

  test("Simple equality rule passes when valid", () => {
    const data = { name: "John" };
    const rule = singleRule(
      parseEval("name"),
      parseEval('name = "John"'),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(0);
    expect(results[0].pathValue).toBe("John");
  });

  test("Simple equality rule fails when invalid", () => {
    const data = { name: "Jane" };
    const rule = singleRule(
      parseEval("name"),
      parseEval('name = "John"'),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(1);
    expect(results[0].pathValue).toBe("Jane");

    // Check failure contents
    const failure = results[0].failures[0];
    expect(failure.call.function).toBe("=");
    expect(failure.evaluatedArgs).toHaveLength(2);
    expect(failure.evaluatedArgs[0].value).toBe("Jane");
    expect(failure.evaluatedArgs[1].value).toBe("John");
  });
});

describe("NotEmpty Validation", () => {
  test("NotEmpty passes for non-empty string", () => {
    const data = { email: "test@example.com" };
    const rule = singleRule(
      parseEval("email"),
      parseEval("$notEmpty(email)"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(0);
  });

  test("NotEmpty fails for empty string", () => {
    const data = { email: "" };
    const rule = singleRule(
      parseEval("email"),
      parseEval("$notEmpty(email)"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(1);

    // Check failure contents
    const failure = results[0].failures[0];
    expect(failure.call.function).toBe("notEmpty");
    expect(failure.evaluatedArgs).toHaveLength(1);
    expect(failure.evaluatedArgs[0].value).toBe("");
  });

  test("NotEmpty fails for null", () => {
    const data = { email: null };
    const rule = singleRule(
      parseEval("email"),
      parseEval("$notEmpty(email)"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(1);

    // Check failure contents
    const failure = results[0].failures[0];
    expect(failure.call.function).toBe("notEmpty");
    expect(failure.evaluatedArgs).toHaveLength(1);
    expect(failure.evaluatedArgs[0].value).toBeNull();
  });
});

describe("Comparison Operations", () => {
  test("Comparison rule passes when valid", () => {
    const data = { age: 25 };
    const rule = singleRule(
      parseEval("age"),
      parseEval("age >= 18"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(0);
  });

  test("Comparison rule fails when invalid", () => {
    const data = { age: 15 };
    const rule = singleRule(
      parseEval("age"),
      parseEval("age >= 18"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(1);

    // Check failure contents
    const failure = results[0].failures[0];
    expect(failure.call.function).toBe(">=");
    expect(failure.evaluatedArgs).toHaveLength(2);
    expect(failure.evaluatedArgs[0].value).toBe(15);
    expect(failure.evaluatedArgs[1].value).toBe(18);
  });
});

describe("Multiple Rules", () => {
  test("Multiple rules validates all", () => {
    const data = { name: "", age: 15 };
    const rules = multiRule(
      singleRule(
        parseEval("name"),
        parseEval("$notEmpty(name)"),
      ),
      singleRule(
        parseEval("age"),
        parseEval("age >= 18"),
      ),
    );

    const results = validateData(data, rules);

    expect(results).toHaveLength(2);
    expect(results[0].failures).toHaveLength(1); // name is empty
    expect(results[1].failures).toHaveLength(1); // age < 18

    // Check first failure (name notEmpty)
    const nameFailure = results[0].failures[0];
    expect(nameFailure.call.function).toBe("notEmpty");
    expect(nameFailure.evaluatedArgs[0].value).toBe("");

    // Check second failure (age >= 18)
    const ageFailure = results[1].failures[0];
    expect(ageFailure.call.function).toBe(">=");
    expect(ageFailure.evaluatedArgs[0].value).toBe(15);
    expect(ageFailure.evaluatedArgs[1].value).toBe(18);
  });
});

describe("WithMessage", () => {
  test("WithMessage attaches message to result", () => {
    const data = { name: "" };
    const rule = withMessage(
      singleRule(
        parseEval("name"),
        parseEval("$notEmpty(name)"),
      ),
      valueExpr("Name is required"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].message).toBe("Name is required");
  });
});

describe("ForEach Rules", () => {
  test("ForEach rule validates each item", () => {
    const data = { items: [{ value: 10 }, { value: 5 }, { value: 20 }] };
    const rule = forEachRule(
      parseEval("items"),
      { type: "var", variable: "i" },
      singleRule(
        parseEval("value"),
        parseEval("value > 7"),
      ),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(3);
    expect(results[0].failures).toHaveLength(0);  // 10 > 7
    expect(results[1].failures).toHaveLength(1);  // 5 <= 7
    expect(results[2].failures).toHaveLength(0);  // 20 > 7

    // Check the failure for item with value 5
    const failure = results[1].failures[0];
    expect(failure.call.function).toBe(">");
    expect(failure.evaluatedArgs).toHaveLength(2);
    expect(failure.evaluatedArgs[0].value).toBe(5);
    expect(failure.evaluatedArgs[1].value).toBe(7);
  });
});

describe("AndMust - Combined Conditions", () => {
  test("AndMust combines conditions - passes when all true", () => {
    const data = { value: 15 };
    const rule = andMust(
      singleRule(
        parseEval("value"),
        parseEval("value >= 10"),
      ),
      parseEval("value <= 20"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(0);
  });

  test("AndMust fails when one condition fails", () => {
    const data = { value: 25 };
    const rule = andMust(
      singleRule(
        parseEval("value"),
        parseEval("value >= 10"),
      ),
      parseEval("value <= 20"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(1); // 25 > 20

    // Check failure contents - the <= 20 condition fails
    const failure = results[0].failures[0];
    expect(failure.call.function).toBe("<=");
    expect(failure.evaluatedArgs).toHaveLength(2);
    expect(failure.evaluatedArgs[0].value).toBe(25);
    expect(failure.evaluatedArgs[1].value).toBe(20);
  });
});

describe("Dependent Data Tracking", () => {
  test("DependentData tracks field dependencies", () => {
    const data = { min: 5, max: 10, value: 7 };
    const rule = singleRule(
      parseEval("value"),
      parseEval("$and(value >= min, value <= max)"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(0);

    // Should track dependency on min and max fields
    const paths = results[0].dependentData.map((p) => printPath(p));
    expect(paths).toContain("min");
    expect(paths).toContain("max");
  });
});

describe("WithProperty", () => {
  test("WithProperty attaches property to result", () => {
    const data = { name: "" };
    const rule = withProp(
      singleRule(
        parseEval("name"),
        parseEval("$notEmpty(name)"),
      ),
      valueExpr("severity"),
      valueExpr("error"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(getProperty<string>(results[0], "severity")).toBe("error");
  });
});

describe("Path Value", () => {
  test("PathValue contains actual value", () => {
    const data = { count: 42 };
    const rule = singleRule(
      parseEval("count"),
      parseEval("count < 100"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].pathValue).toBe(42);
  });
});

describe("Nested Path", () => {
  test("Nested path validates nested field", () => {
    const data = { user: { profile: { age: 30 } } };
    const rule = singleRule(
      parseEval("user.profile.age"),
      parseEval("user.profile.age >= 18"),
    );

    const results = validateData(data, rule);

    expect(results).toHaveLength(1);
    expect(results[0].failures).toHaveLength(0);
    expect(printPath(results[0].path)).toBe("user.profile.age");
  });
});
