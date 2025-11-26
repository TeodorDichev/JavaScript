function solveAndDisplay() {
    console.log("hello");
    const inputText = document.getElementById('input').value.trim();
    const input = inputText.split(/\s+/);
    
    let idx = 0;
    let next = () => input[idx++];
    let nextInt = () => Number(next());

    let n = nextInt();
    let size = n * n;

    // chetene
    let grid = [];
    let symbols = new Set();
    for (let i = 0; i < size; i++) {
        let row = [];
        for (let j = 0; j < size; j++) {
            const s = next();
            row.push(s);
            if (s !== '0') symbols.add(s);
        }
        grid.push(row);
    }

    // pazim unique symbols za reshavane na sudokoto v set
    // vseki row si ima set za da pomnim kakvi symvoli ima vatre
    // vseki col --//--
    // vseki box --//--
    // tozi syntax go vidqh ot https://www.geeksforgeeks.org/javascript/create-an-array-of-given-size-in-javascript/
    let rows = Array.from({ length: size }, () => new Set());
    let cols = Array.from({ length: size }, () => new Set());
    let boxes = Array.from({ length: size }, () => new Set());

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let val = grid[i][j];
            if (val !== '0') {
                rows[i].add(val);
                cols[j].add(val);
                // (0 to n - 1) * n + (0 to n - 1)
                // returns linear numbering from 0 to n^2 - 1
                let boxIndex = Math.floor(i / n) * n + Math.floor(j / n);
                boxes[boxIndex].add(val);
            }
        }
    }

    function solve(i = 0, j = 0) {
        // full table
        if (i == size) return true;

        let ni = i;
        let nj = j + 1;

        if(j == size - 1) {
            ni = i + 1;
            nj = 0;
        }

        // ne e prazna go next
        if (grid[i][j] !== '0') 
            return solve(ni, nj);

        // kletkata e prazna
        let boxIndex = Math.floor(i / n) * n + Math.floor(j / n);
        for (const sym of symbols) {
            // ako symvola go nqma v box/row/col
            if (!rows[i].has(sym) && !cols[j].has(sym) && !boxes[boxIndex].has(sym)) {

                // slagame symvola
                grid[i][j] = sym;
                rows[i].add(sym);
                cols[j].add(sym);
                boxes[boxIndex].add(sym);

                // recursivno otivame natatak kato ponezhe sme 
                // vav for-a ako tozi symvol ne e resh na tazi 
                // kletka shte probva i ostanalite validni symvoli
                if (solve(ni, nj)) 
                    return true;

                // varni kletkata da e pak prazna
                // mahni dobavenie symvol ot col/row/box
                // zashoto tova ne e resheni
                grid[i][j] = '0';
                rows[i].delete(sym);
                cols[j].delete(sym);
                boxes[boxIndex].delete(sym);
            }
        }

        // symvola go ima tova NE e reshenie
        return false;
    }

    solve();

    const outputText = grid.map(row => row.join(' ')).join('\n');
    document.getElementById('output').value = (`${size} x ${size}\n` + outputText);
}
