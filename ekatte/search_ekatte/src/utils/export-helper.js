/**
 * Calculates system resource usage and execution time.
 * @param {number} startTime - The performance.now() timestamp when the process started.
 * @param {Object} startUsage - The process.cpuUsage() object when the process started.
 * @returns {Object} An object containing formatted time, memory, and CPU metrics.
 */
export function calculateStats(startTime, startUsage) {
    const duration = ((performance.now() - startTime)).toFixed(0);
    const cpuRes = process.cpuUsage(startUsage);
    const cpuPercent = ((cpuRes.user + cpuRes.system) / 10000).toFixed(1);
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    return {
        time: `${duration}ms`,
        memory: `${memUsage}MB`,
        cpu: `${cpuPercent}%`
    };
}

/**
 * Replaces empty values with '-'.
 * @param {Array<Object>} data - Rows from database.
 * @returns {Array<Object>} - Returns filtered data.
 */
export function formatNullValues(data) {
    if (!Array.isArray(data)) return [];

    return data.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(key => {
            if (newRow[key] === null || newRow[key] === undefined) {
                newRow[key] = '-';
            }
        });
        return newRow;
    });
}
