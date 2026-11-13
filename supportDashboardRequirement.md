# Support Form – Required Fields
 
## 1. Form Fields
 
| S.No. | Field Name | Field Type |
|-------|------------|------------|
| 1 | Doctor Name | Dropdown / Search |
| 2 | Patient ID | Text / Search |
| 3 | Support Ticket No. | Auto Generated |
| 4 | Reason for Support | Dropdown |
| 5 | Support Date & Time | Auto Generated |
| 6 | Doctor Concern / Issue Description | Long Text |
| 7 | Support Provided / Action Taken | Long Text |
| 8 | Image Attachment | Image Upload |
| 9 | Video Attachment | Video Upload |
| 10 | Support Assigned To | Dropdown (Employee Name) |
| 11 | Support Status | Dropdown |
| 12 | Support Closing Date & Time | Auto Generated |
 
---
 
## 2. Dropdown Options
 
### Reason for Support
 
- Aligner Not Fitting
- Aligner Broken / Missing
- Attachment Issue
- Treatment Plan Issue
- Scanning Issue
- Portal / Login Issue
- Payment / Billing Issue
- Delivery / Courier Issue
- Other
### Support Status
 
- Open
- In Progress
- Pending
- Resolved
- Closed
---
 
## 3. Important Developer Instructions
 
1. **Support Ticket No.** should be auto-generated.
2. **Date & Time** should be captured automatically when a ticket is created.
3. **Image and video attachments** should support uploading multiple files.
4. **Assigned employee** should be selectable from the employee list.
5. **Every status update** should maintain a history with date, time and employee name.
6. **Closing Date & Time** should be automatically captured when the ticket status is changing, along with the person name.
7. **Closed tickets** should remain available for future reference.