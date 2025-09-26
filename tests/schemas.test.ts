import { describe, expect, it } from "vitest";
import {
  collectionIdSchema,
  requestIdSchema,
  folderIdSchema,
  requestHeadersSchema,
  requestBodySchema,
  requestScriptSchema,
  requestUrlSchema,
} from "../src/schemas.js";

describe("schema validation", () => {
  describe("ID schemas", () => {
    it("validates collection IDs", () => {
      expect(collectionIdSchema.safeParse("wrk_123").success).toBe(true);
      expect(collectionIdSchema.safeParse("").success).toBe(false);
      expect(collectionIdSchema.safeParse(null).success).toBe(false);
      expect(collectionIdSchema.safeParse(undefined).success).toBe(false);
    });

    it("validates request IDs", () => {
      expect(requestIdSchema.safeParse("req_123").success).toBe(true);
      expect(requestIdSchema.safeParse("").success).toBe(false);
      expect(requestIdSchema.safeParse(null).success).toBe(false);
    });

    it("validates folder IDs", () => {
      expect(folderIdSchema.safeParse("fld_123").success).toBe(true);
      expect(folderIdSchema.safeParse("").success).toBe(false);
      expect(folderIdSchema.safeParse(null).success).toBe(false);
    });
  });

  describe("request headers schema", () => {
    it("validates proper headers array", () => {
      const validHeaders = [
        { name: "Authorization", value: "Bearer token123" },
        { name: "Content-Type", value: "application/json", disabled: true },
      ];

      expect(requestHeadersSchema.safeParse(validHeaders).success).toBe(true);
      expect(requestHeadersSchema.safeParse(undefined).success).toBe(true);
      expect(requestHeadersSchema.safeParse([]).success).toBe(true);
    });

    it("rejects invalid headers", () => {
      const invalidHeaders = [
        { name: "Authorization" }, // missing value
        { value: "Bearer token123" }, // missing name
        { name: 123, value: "test" }, // wrong type for name
      ];

      for (const header of invalidHeaders) {
        expect(requestHeadersSchema.safeParse([header]).success).toBe(false);
      }
    });

    it("handles disabled flag correctly", () => {
      const headerWithDisabled = [{ name: "Test", value: "value", disabled: false }];
      const headerWithoutDisabled = [{ name: "Test", value: "value" }];

      expect(requestHeadersSchema.safeParse(headerWithDisabled).success).toBe(true);
      expect(requestHeadersSchema.safeParse(headerWithoutDisabled).success).toBe(true);
    });
  });

  describe("request body schema", () => {
    it("validates proper body objects", () => {
      const validBodies = [
        { mimeType: "application/json", text: '{"key":"value"}' },
        { text: "raw text" },
        { mimeType: "application/xml" },
        { customField: "custom value", text: "text" }, // passthrough allows extra fields
      ];

      for (const body of validBodies) {
        expect(requestBodySchema.safeParse(body).success).toBe(true);
      }

      expect(requestBodySchema.safeParse(undefined).success).toBe(true);
    });

    it("allows passthrough of custom fields", () => {
      const bodyWithCustomFields = {
        mimeType: "application/json",
        text: "{}",
        customField: "value",
        anotherField: 123,
      };

      const result = requestBodySchema.safeParse(bodyWithCustomFields);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customField).toBe("value");
        expect(result.data.anotherField).toBe(123);
      }
    });
  });

  describe("request script schema", () => {
    it("validates script strings", () => {
      expect(requestScriptSchema.safeParse("console.log('test');").success).toBe(true);
      expect(requestScriptSchema.safeParse("").success).toBe(true);
      expect(requestScriptSchema.safeParse(undefined).success).toBe(true);
    });

    it("rejects non-string values", () => {
      expect(requestScriptSchema.safeParse(123).success).toBe(false);
      expect(requestScriptSchema.safeParse(null).success).toBe(false);
      expect(requestScriptSchema.safeParse({ script: "test" }).success).toBe(false);
    });
  });

  describe("request URL schema", () => {
    it("validates absolute URLs", () => {
      const validUrls = [
        "https://example.com",
        "http://localhost:3000",
        "https://api.example.com/v1/users",
        "ftp://files.example.com/file.txt",
      ];

      for (const url of validUrls) {
        const result = requestUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      }
    });

    it("validates template URLs", () => {
      const templateUrls = [
        "{{ _.base_url }}/users",
        "https://{{ _.host }}/api",
        "{{ protocol }}://{{ host }}/{{ path }}",
        "https://example.com/{{ endpoint }}",
      ];

      for (const url of templateUrls) {
        const result = requestUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid URLs without templates", () => {
      const invalidUrls = [
        "",
        "not-a-url",
        "just-a-path",
        "/relative/path",
        "://missing-scheme",
      ];

      for (const url of invalidUrls) {
        const result = requestUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      }
    });

    it("provides meaningful error messages", () => {
      const result = requestUrlSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("url is required");
      }

      const result2 = requestUrlSchema.safeParse("invalid-url");
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error.errors[0].message).toBe("url must be a valid URL");
      }
    });

    it("handles edge cases in template detection", () => {
      const edgeCases = [
        "https://example.com/{single}",  // Not a template, but valid URL
        "https://example.com/{{ valid }}",  // Valid template with spaces
        "https://example.com/{{nested{{template}}}}",  // Nested (still valid)
      ];

      // First case should pass (valid URL even if not template)
      expect(requestUrlSchema.safeParse(edgeCases[0]).success).toBe(true);

      // Second case should pass (valid template)
      expect(requestUrlSchema.safeParse(edgeCases[1]).success).toBe(true);

      // Third case should pass (contains template placeholder)
      expect(requestUrlSchema.safeParse(edgeCases[2]).success).toBe(true);
    });
  });

  describe("combined validation scenarios", () => {
    it("validates complete request objects", () => {
      const completeRequest = {
        collectionId: collectionIdSchema.parse("wrk_123"),
        name: "Test Request",
        method: "POST",
        url: requestUrlSchema.parse("https://api.example.com/users"),
        headers: requestHeadersSchema.parse([
          { name: "Content-Type", value: "application/json" },
        ]),
        body: requestBodySchema.parse({
          mimeType: "application/json",
          text: '{"name":"John"}',
        }),
        preRequestScript: requestScriptSchema.parse("console.log('before');"),
        afterResponseScript: requestScriptSchema.parse("console.log('after');"),
      };

      expect(completeRequest).toBeDefined();
      expect(completeRequest.collectionId).toBe("wrk_123");
      expect(completeRequest.url).toBe("https://api.example.com/users");
    });

    it("validates minimal request objects", () => {
      const minimalRequest = {
        collectionId: collectionIdSchema.parse("wrk_123"),
        name: "Minimal Request",
        method: "GET",
        url: requestUrlSchema.parse("{{ _.base_url }}/health"),
      };

      expect(minimalRequest).toBeDefined();
      expect(minimalRequest.url).toBe("{{ _.base_url }}/health");
    });
  });
});