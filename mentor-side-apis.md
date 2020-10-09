# Mentor APIs

### Notifications

-Fetch all
-Mark as read
-Delete one

### Todos

-Add task
POST /mentor/todos/add-task
{
task:'This is task'
isCompleted:true
}
-Edit task (mark as incomplete/complete/delete)
POST /mentor/todos/edit-task
{taskid:xyz
action:markComplete/markIncomplete/delete/edit
content:'optional New name for task if chose edit'}

-Get all tasks
GET /mentor/todos/all-tasks
[
{
task:'This is task'
isCompleted:true
},
{
task:'This is task'
isCompleted:true
}
]

### Profile

-Change Password
-Fetch my profile
GET /mentor/fetch-my-profile
{name,email,phone}
My mentees
GET /mentor/fetch-my-mentees
[
{name,email,phone,assignedOn,profilePhotoUrl},
{name,email,phone,assignedOn,profilePhotoUrl}
]

### Material requests

-Fetch all requests of a mentee
POST /mentor/fetch-material-requests
{menteeId}
-Approve/reject request
POST /mentor/update-material-requests
{requestId:['req1id','req2id',....],action:reject/approve}

### Payment

-Payout history
PENDING... YET TO DECIDE
