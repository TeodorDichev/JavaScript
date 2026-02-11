#include <cmath>
#include <cstdio>
#include <vector>
#include <string>
#include <iostream>
#include <algorithm>
#include <set>
using namespace std;

int main()
{
    int K = 0, L = 0, R = 0;
    std::cin >> K >> L >> R;

    vector<vector<bool>> oranges(K, vector<bool>(L, true));;
    set<pair<int, int>> spoiled;

    int x1 = 0, y1 = 0, y2 = 0, x2 = 0;
    std::cin >> x1 >> y1 >> x2 >> y2;

    oranges[x1][y1] = false;
    spoiled.insert({ x1, y1 });
    oranges[x2][y2] = false;
    spoiled.insert({ x2, y2 });

    for (int i = 0; i < R; i++) {

        vector<vector<int>> directions = { {0, 1}, {1, 0}, {-1, 0}, {0, -1} };
        set<pair<int, int>> newlySpoiled;

        for (auto& spoiledOrange : spoiled) {
            for (auto& dir : directions) {
                int nextX = spoiledOrange.first + dir[0];
                int nextY = spoiledOrange.second + dir[1];

                if (nextX >= 0 && nextX < K && nextY >= 0 && nextY < L && oranges[nextX][nextY]) {
                    oranges[nextX][nextY] = false;
                    newlySpoiled.insert({ nextX, nextY });
                }
            }
        }
        
        for (auto newlySpoiledOrange : newlySpoiled) {
            spoiled.insert(newlySpoiledOrange);
        }
    }

    /*for (auto& spoiledOrange : spoiled) {
        std::cout << spoiledOrange.first << " " << spoiledOrange.second << "\n";
    }*/
    std::cout <<  K * L - spoiled.size();
}

