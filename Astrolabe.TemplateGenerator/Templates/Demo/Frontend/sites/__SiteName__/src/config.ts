/**
 * Application configuration
 * Reads environment variables and provides typed access to configuration values
 */

export const config = {
  /**
   * Base URL for API requests
   * Defaults to localhost for development
   */
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL || "https://localhost:__HttpsPort__",
} as const;

/**
 * Validates that all required environment variables are set
 * Call this during application initialization
 */
export function validateConfig(): void {
  const required = ["NEXT_PUBLIC_API_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables: ${missing.join(", ")}. Using defaults.`
    );
  }
}
