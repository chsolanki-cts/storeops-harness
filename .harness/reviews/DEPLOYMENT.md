## Deployment Target

**Environment:** Local Docker container

**Image:** Built from the project `Dockerfile` using `npm run build` output

**Port:** 3000 (mapped from container port 3000)

## Steps Taken

1. Containerised the application
2. Ran `docker compose up -d` - to start the container
3. Verified the app was running by hitting `GET /api/activities` (empty list response)
4. Added 2 sample tasks by calling — `POST /api/activities/` — twice with different task details
5. Exercised the Sprint 1 feature — `PATCH /api/activities/bulk-status` — against the running container, capturing screenshots of error and success scenarios

---

## Screenshots showing the new endpoint responding in the running application:
Running the app in docker container:
![Running the app in docker container](./screenshots/1_docker.png)

Initial blank get activities call:
![Initial blank get activities call](./screenshots/2_GetActivity1.png)

Adding Task 1:
![Adding Task 1](./screenshots/3_addTask1.png)

Adding Task 2:
![Adding Task 2](./screenshots/4_addTask2.png)

Getting list of activities with Task 1 and Task 2 pending:
![Getting list of activities with Task 1 and Task 2 pending](./screenshots/5_GetActivity2.png)

Bulk status error scenario (the status is not done or blocked)
![Bulk status error scenario](./screenshots/6_BulkStatusError.png)

Bulk status success scenario: update Task 1 (to done) and Task 2 (to blocked)
![Bulk status success scenario](./screenshots/7_BulkStatusSuccess.png)

Getting list of activities with Task 1 done and Task 2 blocked:
![get activities call after update](./screenshots/8_GetActivity3.png)
