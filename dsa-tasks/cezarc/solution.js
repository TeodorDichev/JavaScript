const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf8').split(/\s+/).filter(s => s);
    if (!input.length) return;

    const n = parseInt(input[0]);
    const words = input.slice(1, n + 1);

    const order = [];
    const seen = new Set();
    for (const word of words) {
        for (const char of word) {
            if (!seen.has(char)) {
                seen.add(char);
                order.push(char.charCodeAt(0) - 97);
            }
        }
    }

    for (let i = 0; i < 26; i++) {
        if (!seen.has(String.fromCharCode(i + 97))) order.push(i);
    }

    const adj = Array.from({ length: 26 }, () => []);
    const inDegree = new Array(26).fill(0);

    for (let i = 0; i < n - 1; i++) {
        let w1 = words[i], w2 = words[i+1];
        let diff = false;
        for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
            if (w1[j] !== w2[j]) {
                let u = w1[j].charCodeAt(0) - 97;
                let v = w2[j].charCodeAt(0) - 97;
                adj[u].push(v);
                inDegree[v]++;
                diff = true;
                break;
            }
        }
        if (!diff && w1.length > w2.length) return console.log("No");
    }

    let result = [];
    let processed = new Array(26).fill(false);

    for (let count = 0; count < 26; count++) {
        let found = false;
        for (let u of order) {
            if (!processed[u] && inDegree[u] === 0) {
                processed[u] = true;
                result.push(String.fromCharCode(u + 97));
                for (let v of adj[u]) inDegree[v]--;
                found = true;
                break;
            }
        }
        if (!found) break;
    }

    if (result.length < 26) {
        console.log("No");
    } else {
        console.log("Yes\n" + result.join(''));
    }
}

solve();