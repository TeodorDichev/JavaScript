#include <bits/stdc++.h>

using namespace std;

bool canCarry(int k, const vector<int>& weights, long long cap) {
	multiset<int> goats(weights.begin(), weights.end());
	for (int i = 0; i < k && !goats.empty(); i++) {
		long long remaining = cap;
		while (!goats.empty()) {
			auto iterator = goats.upper_bound(remaining);
			if (iterator == goats.begin()) break;
			iterator--;
			remaining -= *iterator;
			goats.erase(iterator);
		}
	}

	return goats.empty();
}

int minCapacity(int n, int k, const vector<int>& weights) {
	long long low = *max_element(weights.begin(), weights.end());
	long long high = 0;
	for (int w : weights) high += w;

	while (low < high) {
		long long mid = (low + high) / 2;

		if (canCarry(k, weights, mid)) high = mid;
		else low = mid + 1; 
	}

	return (int)low;
}

int main() {
	int n, k;
	cin >> n >> k;
	vector<int> weights(n);
	for(int i = 0; i < n; ++i) cin >> weights[i];
	cout << minCapacity(n, k, weights) << endl;
}
