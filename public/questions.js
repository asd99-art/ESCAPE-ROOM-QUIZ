// questions.js - All quiz data for the Escape Room Quiz App
// Each room has an id, title, icon, description, and an 8-question pool (4 easy, 4 hard).
// Adaptive logic chooses 5 questions per room based on performance.
// Each question has: text, options (array of 4), correctIndex (0-based),
//   explanation, hint, level ("easy" | "hard"), and topic.

const ROOMS = [
  {
    id: 'algorithm-vault',
    title: 'The Algorithm Vault',
    icon: '⚙️',
    description: 'Unlock the secrets of algorithms and data structures.',
    questions: [
      // ── 4 EASY QUESTIONS ──
      {
        text: 'What is the worst-case time complexity of Bubble Sort?',
        options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
        correctIndex: 2,
        explanation:
          'Bubble Sort compares every pair of adjacent elements. In the worst case (reverse-sorted input) it makes n×(n-1)/2 comparisons, giving O(n²).',
        hint: 'Think about what happens when the array is completely in reverse order — every element must move past every other.',
        level: 'easy',
        topic: 'Sorting'
      },
      {
        text: 'Which data structure operates on a Last-In, First-Out (LIFO) principle?',
        options: ['Queue', 'Stack', 'Linked List', 'Heap'],
        correctIndex: 1,
        explanation:
          'A Stack is LIFO: the last element pushed is the first one popped — like a stack of plates.',
        hint: 'Imagine a stack of plates: you always take the top plate first.',
        level: 'easy',
        topic: 'Data Structures'
      },
      {
        text: 'What does "overfitting" mean in machine learning?',
        options: [
          'The model performs well on training data but poorly on new data',
          'The model is too simple to capture patterns',
          'The model trains too slowly',
          'The model has too few parameters'
        ],
        correctIndex: 0,
        explanation:
          'Overfitting occurs when a model memorises training data noise, so it generalises poorly to unseen examples. The fix is regularisation, more data, or simpler models.',
        hint: 'Overfitting is about how the model performs on data it has NEVER seen before.',
        level: 'easy',
        topic: 'Machine Learning'
      },
      {
        text: 'What is the average-case time complexity of Binary Search?',
        options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
        correctIndex: 2,
        explanation:
          'Binary Search halves the search space on every step, so it needs at most log₂(n) comparisons — O(log n) on average and worst case.',
        hint: 'Each comparison cuts the remaining search space exactly in half.',
        level: 'easy',
        topic: 'Searching'
      },

      // ── 4 HARD QUESTIONS ──
      {
        text: 'Which algorithm is used to find the shortest path in a weighted graph with non-negative edge weights?',
        options: ["Dijkstra's Algorithm", 'Binary Search', 'Merge Sort', 'DFS'],
        correctIndex: 0,
        explanation:
          "Dijkstra's Algorithm greedily expands the nearest unvisited node, guaranteeing shortest paths in graphs with non-negative edge weights.",
        hint: 'The algorithm is named after a Dutch computer scientist and involves a priority queue.',
        level: 'hard',
        topic: 'Graph Algorithms'
      },
      {
        text: 'What is the worst-case time complexity of QuickSort when using the first element as pivot on an already sorted array?',
        options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
        correctIndex: 1,
        explanation:
          'If the array is already sorted and the first element is selected as pivot, partitions are split into 0 and n-1 elements at each step, yielding O(n²).',
        hint: 'Severely unbalanced partitions lead to quadratic time.',
        level: 'hard',
        topic: 'Sorting'
      },
      {
        text: 'In an AVL Tree, what is the maximum allowed difference between heights of left and right subtrees for any node?',
        options: ['0', '1', '2', 'log(n)'],
        correctIndex: 1,
        explanation:
          'AVL trees maintain a balance factor of -1, 0, or 1. If the difference between heights exceeds 1, tree rotations are performed.',
        hint: 'AVL trees are strictly height-balanced by at most a single level difference.',
        level: 'hard',
        topic: 'Data Structures'
      },
      {
        text: 'Which algorithmic paradigm does the Floyd-Warshall all-pairs shortest paths algorithm use?',
        options: ['Greedy Approach', 'Divide and Conquer', 'Dynamic Programming', 'Backtracking'],
        correctIndex: 2,
        explanation:
          'Floyd-Warshall solves all-pairs shortest paths by building upon intermediate vertex subproblems using Dynamic Programming.',
        hint: 'It breaks the problem into overlapping subproblems with optimal substructure.',
        level: 'hard',
        topic: 'Graph Algorithms'
      }
    ]
  },
  {
    id: 'statistics-lab',
    title: 'The Statistics Lab',
    icon: '📊',
    description: 'Navigate through probability, averages, and data distributions.',
    questions: [
      // ── 4 EASY QUESTIONS ──
      {
        text: 'A dataset is: 2, 3, 3, 7, 100. Which measure best represents the "typical" value?',
        options: ['Mean', 'Median', 'Mode', 'Range'],
        correctIndex: 1,
        explanation:
          'The mean is 23, pulled far up by the outlier 100. The median (middle value = 3) is resistant to outliers and better represents the typical value here.',
        hint: 'One of these measures is not affected by extreme values like 100.',
        level: 'easy',
        topic: 'Averages'
      },
      {
        text: 'What does a standard deviation of 0 tell you about a dataset?',
        options: [
          'All values are negative',
          'All values are identical',
          'The dataset is empty',
          'The mean equals the median'
        ],
        correctIndex: 1,
        explanation:
          'Standard deviation measures spread. If every value is the same, there is zero deviation from the mean, so SD = 0.',
        hint: 'Standard deviation measures how spread out values are. If there is NO spread at all…',
        level: 'easy',
        topic: 'Spread'
      },
      {
        text: 'Which type of correlation means that as one variable increases, the other decreases?',
        options: [
          'Positive correlation',
          'Zero correlation',
          'Negative correlation',
          'Spurious correlation'
        ],
        correctIndex: 2,
        explanation:
          'Negative (inverse) correlation: e.g., as temperature rises, hot-drink sales fall. The correlation coefficient r is between -1 and 0.',
        hint: 'The name reflects the direction of the relationship — one goes up while the other goes down.',
        level: 'easy',
        topic: 'Correlation'
      },
      {
        text: 'What is the probability of rolling a 6 on a fair six-sided die?',
        options: ['1/3', '1/4', '1/6', '1/2'],
        correctIndex: 2,
        explanation:
          'A fair die has 6 equally likely outcomes. Only one of them is 6, so P(6) = 1/6 ≈ 0.167.',
        hint: 'Probability = (number of favourable outcomes) ÷ (total possible outcomes).',
        level: 'easy',
        topic: 'Probability'
      },

      // ── 4 HARD QUESTIONS ──
      {
        text: 'In a normal distribution, approximately what percentage of data falls within one standard deviation of the mean?',
        options: ['50%', '68%', '95%', '99.7%'],
        correctIndex: 1,
        explanation:
          'The empirical 68-95-99.7 rule: ~68% of data lies within ±1σ, ~95% within ±2σ, and ~99.7% within ±3σ of the mean.',
        hint: 'Remember the 68-95-99.7 rule. The first number applies to ±1 standard deviation.',
        level: 'hard',
        topic: 'Distributions'
      },
      {
        text: 'What does a Type I error represent in hypothesis testing?',
        options: [
          'Rejecting a true null hypothesis',
          'Failing to reject a false null hypothesis',
          'Calculating an incorrect p-value',
          'Selecting a sample size that is too small'
        ],
        correctIndex: 0,
        explanation:
          'A Type I error is a "false positive": rejecting the null hypothesis (H₀) when it is actually true.',
        hint: 'It is a false alarm — claiming an effect exists when it actually does not.',
        level: 'hard',
        topic: 'Hypothesis Testing'
      },
      {
        text: 'If events A and B are mutually exclusive with P(A) = 0.3 and P(B) = 0.4, what is P(A ∩ B)?',
        options: ['0.12', '0.70', '0.00', '0.10'],
        correctIndex: 2,
        explanation:
          'Mutually exclusive events cannot happen at the same time by definition; thus, the probability of their intersection is 0.',
        hint: 'Can two mutually exclusive events happen together?',
        level: 'hard',
        topic: 'Probability'
      },
      {
        text: 'For a positively (right) skewed distribution, which relationship between measures of central tendency typically holds?',
        options: ['Mean < Median < Mode', 'Mode < Median < Mean', 'Mean = Median = Mode', 'Median < Mean < Mode'],
        correctIndex: 1,
        explanation:
          'In a right-skewed distribution, the tail of high values pulls the mean further to the right than the median and mode.',
        hint: 'Extreme high values pull the mean upward the most.',
        level: 'hard',
        topic: 'Distributions'
      }
    ]
  },
  {
    id: 'database-dungeon',
    title: 'The Database Dungeon',
    icon: '🗄️',
    description: 'Escape by mastering SQL, keys, and database design.',
    questions: [
      // ── 4 EASY QUESTIONS ──
      {
        text: 'What is the purpose of a Primary Key in a relational database?',
        options: [
          'To encrypt the table',
          'To uniquely identify each row in a table',
          'To link two databases together',
          'To speed up DELETE operations'
        ],
        correctIndex: 1,
        explanation:
          'A Primary Key must be unique and NOT NULL for every row. It is the canonical way to identify a single record and is used by Foreign Keys to create relationships.',
        hint: 'Think about what makes each row distinct and individually reachable in a table.',
        level: 'easy',
        topic: 'Keys'
      },
      {
        text: 'Which SQL keyword removes duplicate rows from a result set?',
        options: ['UNIQUE', 'DISTINCT', 'FILTER', 'REMOVE'],
        correctIndex: 1,
        explanation:
          'SELECT DISTINCT col FROM table; returns only unique values in the chosen column(s), eliminating duplicated rows.',
        hint: 'The keyword is a common English adjective meaning "clearly different or separate".',
        level: 'easy',
        topic: 'Queries'
      },
      {
        text: 'What does SQL stand for?',
        options: [
          'Structured Query Language',
          'Simple Question Language',
          'Sequential Queue Logic',
          'System Query Loader'
        ],
        correctIndex: 0,
        explanation:
          'SQL — Structured Query Language — is the standard language for managing and querying relational databases, introduced by IBM in the 1970s.',
        hint: 'The "S" comes from a word meaning "organised by rules or a clear system".',
        level: 'easy',
        topic: 'Foundations'
      },
      {
        text: 'Which type of JOIN returns only the rows that have matching values in both tables?',
        options: ['LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'INNER JOIN'],
        correctIndex: 3,
        explanation:
          'INNER JOIN returns the intersection: only rows where the join condition matches in BOTH tables. Rows without a match in either table are excluded.',
        hint: 'This join returns the intersection — only rows that exist on both sides of the join.',
        level: 'easy',
        topic: 'Joins'
      },

      // ── 4 HARD QUESTIONS ──
      {
        text: 'Which normal form eliminates partial dependencies on a composite primary key?',
        options: [
          'First Normal Form (1NF)',
          'Second Normal Form (2NF)',
          'Third Normal Form (3NF)',
          'Boyce-Codd Normal Form (BCNF)'
        ],
        correctIndex: 1,
        explanation:
          'In 2NF every non-key attribute must depend on the WHOLE primary key, not just part of it. This removes partial dependencies that exist when the key is composite.',
        hint: 'Normal forms are numbered 1, 2, 3… each one builds on the previous. Partial dependencies are the target.',
        level: 'hard',
        topic: 'Normalization'
      },
      {
        text: 'Which ACID property guarantees that database updates persist even in the event of a system crash or power outage?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correctIndex: 3,
        explanation:
          'Durability guarantees that once a transaction has committed, its updates survive any subsequent system crash or reboot.',
        hint: 'Think of something durable that lasts through a disaster.',
        level: 'hard',
        topic: 'Transactions'
      },
      {
        text: 'In relational database indexing, why are B+ Trees preferred over Binary Search Trees for disk storage?',
        options: [
          'B+ Trees have fewer nodes overall',
          'B+ Trees have high fan-out, drastically minimizing disk I/O operations',
          'B+ Trees do not require data to be sorted',
          'B+ Trees require less RAM than BSTs'
        ],
        correctIndex: 1,
        explanation:
          'B+ Trees have a high branching factor (fan-out), which keeps tree height low (typically 3-4 levels) and minimizes costly disk I/O reads.',
        hint: 'High fan-out means fewer levels and fewer disk reads.',
        level: 'hard',
        topic: 'Indexing'
      },
      {
        text: 'Which normal form requires that a relation is in 3NF and every determinant is a candidate key?',
        options: [
          'Boyce-Codd Normal Form (BCNF)',
          'Fourth Normal Form (4NF)',
          'Domain-Key Normal Form (DKNF)',
          'Second Normal Form (2NF)'
        ],
        correctIndex: 0,
        explanation:
          'BCNF is a stricter form of 3NF: for every functional dependency X -> Y, X must be a superkey/candidate key.',
        hint: 'It is often nicknamed 3.5NF and named after two relational pioneers.',
        level: 'hard',
        topic: 'Normalization'
      }
    ]
  }
];
