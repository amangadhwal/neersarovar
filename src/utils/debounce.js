/**
 * Debounce function to limit the rate at which a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to trigger function immediately
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 100, immediate = false) {
    let timeout;
    
    return function(...args) {
        const context = this;
        
        // Execute function immediately if immediate is true and timeout is not present
        const callNow = immediate && !timeout;
        
        // Clear the existing timeout
        clearTimeout(timeout);
        
        // Set the new timeout
        timeout = setTimeout(function() {
            timeout = null;
            
            // Only execute the function if immediate is false
            if (!immediate) func.apply(context, args);
        }, wait);
        
        // Call function directly if we should execute immediately
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function to limit the rate at which a function is executed
 * @param {Function} func - Function to throttle
 * @param {number} limit - Execution limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    let lastResult;
    
    return function(...args) {
        const context = this;
        
        if (!inThrottle) {
            lastResult = func.apply(context, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
        
        return lastResult;
    };
}