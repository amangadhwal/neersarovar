/**
 * BatchProcessor for optimized processing of large data sets
 * Helps prevent UI blocking when performing intensive operations
 */
export class BatchProcessor {
    constructor() {
        this.batches = [];
        this.isProcessing = false;
        this.currentBatch = null;
        this.frameId = null;
        this.stats = {
            totalProcessed: 0,
            batchesProcessed: 0,
            averageTimePerBatch: 0,
            totalTime: 0
        };
    }
    
    /**
     * Add a batch of items to be processed
     * @param {Array} items - Items to process
     * @param {Function} processor - Processing function
     * @param {Function} onComplete - Callback when batch completes
     */
    addBatch(items, processor, onComplete) {
        this.batches.push({
            items,
            processor,
            onComplete,
            processed: 0
        });
        
        if (!this.isProcessing) {
            this.processNextBatch();
        }
    }
    
    /**
     * Process the next batch in the queue
     */
    processNextBatch() {
        if (this.batches.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        this.currentBatch = this.batches.shift();
        this.processChunk(
            this.currentBatch.items,
            this.currentBatch.processor,
            0,
            this.currentBatch.onComplete
        );
    }
    
    /**
     * Process a chunk of the current batch
     * @param {Array} items - Items to process
     * @param {Function} processor - Processing function
     * @param {number} startIdx - Starting index
     * @param {Function} onComplete - Callback when complete
     */
    processChunk(items, processor, startIdx, onComplete) {
        const batchSize = 100;
        const startTime = performance.now();
        
        let i = startIdx;
        const endIdx = Math.min(i + batchSize, items.length);
        
        for (; i < endIdx; i++) {
            processor(items[i], i);
            this.stats.totalProcessed++;
        }
        
        this.currentBatch.processed = i;
        
        if (i < items.length) {
            // Schedule next chunk
            this.frameId = requestAnimationFrame(() => {
                this.processChunk(items, processor, i, onComplete);
            });
        } else {
            // Batch complete
            const endTime = performance.now();
            const batchTime = endTime - startTime;
            
            this.stats.batchesProcessed++;
            this.stats.totalTime += batchTime;
            this.stats.averageTimePerBatch = this.stats.totalTime / this.stats.batchesProcessed;
            
            if (onComplete) {
                onComplete();
            }
            
            // Process next batch
            this.processNextBatch();
        }
    }
    
    /**
     * Clear all pending batches
     */
    clear() {
        this.batches = [];
        
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        
        this.isProcessing = false;
        this.currentBatch = null;
    }
    
    /**
     * Get statistics about processing
     * @returns {Object} Processing statistics
     */
    getStats() {
        return { ...this.stats };
    }
}