# Project Estimation - FUTURE
Date: 2024-05-04

Version: 1.0


# Estimation approach
Consider the EZElectronics  project in FUTURE version (as proposed by your team in requirements V2), assume that you are going to develop the project INDEPENDENT of the deadlines of the course, and from scratch (not from V1)
# Estimate by size
### 
|             | Estimate                        |             
| ----------- | ------------------------------- |  
| NC =  Estimated number of classes to be developed   |              15               |             
|  A = Estimated average size per class, in LOC       |          120                  | 
| S = Estimated size of project, in LOC (= NC * A) | 1800 |
| E = Estimated effort, in person hours (here use productivity 10 LOC per person hour)  |             180                         |   
| C = Estimated cost, in euro (here use 1 person hour cost = 30 euro) | 5400 | 
| Estimated calendar time, in calendar weeks (Assume team of 4 people, 8 hours per day, 5 days per week ) |      2              |               

# Estimate by product decomposition
### 
|         component name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
|requirement document    | 15 |
| GUI prototype |10|
|design document |10|
|code |180 |
| unit tests |10|
| api tests |10|
| management documents  |20|



# Estimate by activity decomposition
### 
| Activity Name                       | Estimated Effort (person hours) |
|-------------------------------------|---------------------------------|
| **GROUP AND PROJECT MANAGEMENT**    |                                 |
| Project management                  | 5                               |
| Scheduling                          | 3                               |
| Risk estimation                     | 3                               |
| **REQUIREMENTS PLANNING**           |                                 |
| Review existing systems             | 5                               |
| Work analysis                       | 3                               |
| Model process                       | 5                               |
| Identify Functional Requirements    | 20                              |
| Identify Non-Functional Requirements| 5                               |
| **DESIGN**                          |                                 |
| Identify and develop the prototype design | 5                         |
| Developing the GUI prototype        | 15                               |
| **IMPLEMENTATION**                  |                                 |
| Develop Functional Requirements     | 120                              |
| Developing the Controllers, Test Code etc. | 60                       |
| **TESTING**                         |                                 |
| API testing                         | 10                               |
| UI testing                          | 5                              |
| Testing of NF requirements          | 5                               |

![gantt](images/gantt2.png)

# Summary

|             | Estimated effort                        |   Estimated duration |          
| ----------- | ------------------------------- | ---------------|
| estimate by size |180 PH| 2 Weeks|
| estimate by product decomposition |255 PH| 6 Weeks|
| estimate by activity decomposition |269 PH| 7 Weeks|


The Estimate by Size approach provides the most optimistic timeline, likely due to its focus on the sheer volume of code to be written, assuming a constant productivity rate. This method does not account for the complexity of tasks or potential bottlenecks in the development process.

On the other hand, the Estimate by Product Decomposition and Estimate by Activity Decomposition methods yield higher effort estimates and longer durations. These approaches consider individual components and activities, respectively, which can reveal complexities and dependencies not apparent in size-based estimates. For instance, the effort for creating management documents or conducting API testing may take longer than anticipated when considering the intricacies involved.

Furthermore, the Estimate by Activity Decomposition approach includes time for project management and risk estimation, which are crucial for a realistic timeline but often overlooked in size-based estimates. This method also accounts for the effort required in understanding and planning requirements, which can be substantial.


