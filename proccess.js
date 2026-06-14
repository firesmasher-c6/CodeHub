// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// Load Firebase configuration from environment variables
// In production, use a build tool like Vite or Webpack to inject these
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDnrewO1-8C3cVJf5Ut7zdENM8Xvg3tRPQ",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "store-535d8.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://store-535d8-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "store-535d8",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "store-535d8.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "765081089260",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:765081089260:web:df7ddcffc49aa0e9a921c9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Error codes reference
const ERROR_CODES = {
    T10: "Code contains disallowed imports or lines",
    T11: "Invalid addon name format",
    T12: "Author name is required",
    T13: "Description is too short (minimum 20 characters)",
    T14: "Invalid download URL format",
    T15: "Network error - unable to connect to server",
    T16: "Database error - unable to save addon",
    T17: "Addon already exists with this name",
    T18: "File validation failed",
    T19: "Unauthorized - invalid submission",
    T20: "Rate limit exceeded - please wait before submitting again"
};

// Blocked imports and patterns
const BLOCKED_PATTERNS = [
    /subprocess/gi,
    /os\.system/gi,
    /os\.popen/gi,
    /ProcessBuilder/gi,
    /Runtime\.getRuntime\(\)\.exec/gi,
    /\/bin\/sh/gi,
    /\/bin\/bash/gi,
    /cmd\.exe/gi,
    /powershell/gi,
    /java\.lang\.reflect/gi,
    /java\.io\.File/gi,
    /RandomAccessFile/gi
];

class AddonProcessor {
    constructor() {
        this.validateOnLoad();
    }

    /**
     * Validate form and process submission
     */
    async processSubmission(formData) {
        try {
            // Validate input
            const validation = this.validateInput(formData);
            if (!validation.valid) {
                return this.returnError(validation.error, validation.code);
            }

            // Show loading state
            this.setLoadingState(true);

            // Check for blocked patterns if code is provided
            if (formData.code) {
                const blocked = this.checkBlockedPatterns(formData.code);
                if (blocked) {
                    return this.returnError(`Code contains disallowed pattern: ${blocked}`, "T10");
                }
            }

            // Create addon object
            const addon = {
                name: formData.name.trim(),
                author: formData.author.trim(),
                description: formData.description.trim(),
                downloadLink: formData.downloadLink.trim(),
                version: formData.version || "1.0.0",
                code: formData.code || "",
                createdAt: new Date().toISOString(),
                status: "pending",
                approved: false,
                downloads: 0,
                rating: 0,
                ratingCount: 0
            };

            // Save to Firebase
            await this.saveToFirebase(addon);

            // Success response
            this.setLoadingState(false);
            return this.returnSuccess(addon);

        } catch (error) {
            console.error("Processing error:", error);
            this.setLoadingState(false);
            return this.returnError("An unexpected error occurred: " + error.message, "T15");
        }
    }

    /**
     * Validate form input
     */
    validateInput(formData) {
        // Check addon name
        if (!formData.name || formData.name.trim().length < 3) {
            return {
                valid: false,
                error: "Addon name must be at least 3 characters long",
                code: "T11"
            };
        }

        // Validate name format (alphanumeric, spaces, hyphens)
        if (!/^[a-zA-Z0-9\s\-]+$/.test(formData.name)) {
            return {
                valid: false,
                error: "Addon name can only contain letters, numbers, spaces, and hyphens",
                code: "T11"
            };
        }

        // Check author
        if (!formData.author || formData.author.trim().length < 2) {
            return {
                valid: false,
                error: "Author name is required",
                code: "T12"
            };
        }

        // Check description
        if (!formData.description || formData.description.trim().length < 20) {
            return {
                valid: false,
                error: "Description must be at least 20 characters long",
                code: "T13"
            };
        }

        // Check download link
        if (!formData.downloadLink) {
            return {
                valid: false,
                error: "Download link is required",
                code: "T14"
            };
        }

        // Validate URL format
        try {
            new URL(formData.downloadLink);
        } catch (e) {
            return {
                valid: false,
                error: "Invalid download URL format",
                code: "T14"
            };
        }

        return { valid: true };
    }

    /**
     * Check for blocked patterns in code
     */
    checkBlockedPatterns(code) {
        for (let pattern of BLOCKED_PATTERNS) {
            if (pattern.test(code)) {
                return pattern.source;
            }
        }
        return null;
    }

    /**
     * Save addon to Firebase Realtime Database
     */
    async saveToFirebase(addon) {
        try {
            const addonsRef = ref(database, 'addons');
            const newAddonRef = push(addonsRef);
            
            await set(newAddonRef, {
                ...addon,
                id: newAddonRef.key
            });

            console.log("Addon saved successfully with ID:", newAddonRef.key);
            return newAddonRef.key;

        } catch (error) {
            console.error("Firebase error:", error);
            throw new Error("T16");
        }
    }

    /**
     * Load addons from Firebase
     */
    async loadAddonsFromFirebase() {
        try {
            const addonsRef = ref(database, 'addons');
            // This would require Firebase SDK's onValue listener
            console.log("Loading addons from Firebase...");
            // Implementation depends on how you want to display addons
        } catch (error) {
            console.error("Error loading addons:", error);
            throw new Error("T15");
        }
    }

    /**
     * Validate on page load
     */
    validateOnLoad() {
        const form = document.getElementById('addonForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    name: document.getElementById('addonName')?.value || '',
                    author: document.getElementById('author')?.value || '',
                    description: document.getElementById('description')?.value || '',
                    downloadLink: document.getElementById('downloadLink')?.value || '',
                    version: document.getElementById('version')?.value || '1.0.0',
                    code: document.getElementById('addonCode')?.value || ''
                };

                const result = await this.processSubmission(formData);
                this.displayResult(result);
            });
        }
    }

    /**
     * Set loading state
     */
    setLoadingState(loading) {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? 'Submitting...' : 'Submit Addon';
        }
    }

    /**
     * Return error response
     */
    returnError(message, code) {
        return {
            success: false,
            error: message,
            code: code,
            details: ERROR_CODES[code] || "Unknown error"
        };
    }

    /**
     * Return success response
     */
    returnSuccess(addon) {
        return {
            success: true,
            message: "Addon submitted successfully!",
            addon: addon,
            code: "SUCCESS"
        };
    }

    /**
     * Display result to user
     */
    displayResult(result) {
        const resultDiv = document.getElementById('submissionResult') || this.createResultDiv();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; border-left: 4px solid #28a745;">
                    <strong>✓ Success!</strong><br>
                    ${result.message}<br>
                    <small>Your addon has been submitted for review.</small>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; border-left: 4px solid #f5c6cb;">
                    <strong>✗ Error ${result.code}!</strong><br>
                    ${result.error}<br>
                    <small>${result.details}</small>
                </div>
            `;
        }
        
        resultDiv.style.display = 'block';
    }

    /**
     * Create result display div if it doesn't exist
     */
    createResultDiv() {
        const div = document.createElement('div');
        div.id = 'submissionResult';
        div.style.marginTop = '20px';
        const form = document.getElementById('addonForm');
        if (form) {
            form.parentNode.insertBefore(div, form.nextSibling);
        }
        return div;
    }

    /**
     * Get error code and message
     */
    static getErrorInfo(code) {
        return {
            code: code,
            message: ERROR_CODES[code] || "Unknown error"
        };
    }

    /**
     * Get all error codes
     */
    static getAllErrorCodes() {
        return ERROR_CODES;
    }
}

// Initialize addon processor
const processor = new AddonProcessor();

// Export for use in HTML
window.AddonProcessor = AddonProcessor;
window.processor = processor;