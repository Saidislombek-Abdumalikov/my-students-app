// User and Auth Types
export type UserRole = 'ADMIN' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

// Student Types
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  enrollmentDate: string;
  status: StudentStatus;
  notes?: string;
  avatarUrl?: string;
  createdAt: string;
}

// Group Types
export type GroupStatus = 'ACTIVE' | 'ARCHIVED';

export interface Group {
  id: string;
  name: string;
  teacherId: string;
  courseSubject: string; // e.g. IELTS 6.5, General English
  level: string; // e.g. Intermediate, Advanced
  scheduleDescription: string; // e.g. Mon/Wed/Fri 14:00 - 15:30
  startDate: string;
  status: GroupStatus;
  notes?: string;
  createdAt: string;
}

export interface GroupStudent {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  status: 'ACTIVE' | 'LEFT';
}

// Lesson Types
export type LessonStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';

export interface Lesson {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  title: string;
  status: LessonStatus;
  notes?: string;
  createdAt: string;
}

// Attendance Types
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface Attendance {
  id: string;
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  lateMinutes?: number; // Exact lateness minutes
  note?: string;
  updatedAt: string;
}

// Homework Types
export type HomeworkTaskType = 
  | 'READING' 
  | 'LISTENING' 
  | 'WRITING' 
  | 'SPEAKING' 
  | 'VOCABULARY' 
  | 'GRAMMAR' 
  | 'FILE' 
  | 'LINK' 
  | 'CUSTOM';

export type HomeworkSubmissionStatus = 
  | 'NOT_CHECKED' 
  | 'COMPLETED' 
  | 'MISSING' 
  | 'LATE' 
  | 'PARTIAL';

export interface HomeworkPackage {
  id: string;
  groupId: string;
  lessonId: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
}

export interface HomeworkTask {
  id: string;
  packageId: string;
  title: string;
  taskType: HomeworkTaskType;
  instructions: string;
  attachmentUrl?: string;
  linkUrl?: string;
  maxScore?: number;
}

export interface HomeworkSubmission {
  id: string;
  taskId: string;
  studentId: string;
  status: HomeworkSubmissionStatus;
  completedTaskIds?: string[];
  completionPercentage?: number;
  score?: number;
  comment?: string;
  updatedAt: string;
}

export interface HomeworkLibraryItem {
  id: string;
  title: string;
  courseSubject: string;
  level: string;
  category: string;
  tasks: Omit<HomeworkTask, 'id' | 'packageId'>[];
  tags: string[];
  createdAt: string;
}

// Test Types
export type TestCategory = 
  | 'IELTS_LISTENING' 
  | 'IELTS_READING' 
  | 'IELTS_WRITING' 
  | 'IELTS_SPEAKING' 
  | 'IELTS_OVERALL' 
  | 'GENERAL';

export interface Test {
  id: string;
  groupId: string;
  title: string;
  date: string;
  category: TestCategory;
  maxScore: number;
  createdAt: string;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  percentage: number;
  listeningScore?: number;
  readingScore?: number;
  writingScore?: number;
  speakingScore?: number;
  comment?: string;
  screenshotUrl?: string;
  createdAt: string;
}

// Lesson Plan & Learned Material Types
export interface LessonPlan {
  id: string;
  lessonId: string;
  groupId?: string;
  targetDate?: string;
  topic: string;
  objectives: string;
  vocabulary?: string;
  grammar?: string;
  reading?: string;
  listening?: string;
  speaking?: string;
  writing?: string;
  activities?: string;
  materials?: string;
  plannedHomework?: string;
  teacherNotes?: string;
  status?: 'PENDING' | 'COMPLETED';
}

export interface LearnedMaterial {
  id: string;
  lessonId: string;
  vocabulary?: string;
  grammar?: string;
  readingPassage?: string;
  listeningActivity?: string;
  speakingTopic?: string;
  writingTechnique?: string;
  examStrategy?: string;
  customNotes?: string;
}

// Payment Types
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

export interface Payment {
  id: string;
  studentId: string;
  groupId: string;
  amount: number;
  paymentDate: string;
  periodMonth: string; // YYYY-MM
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
}

// File Types
export interface FileRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  studentId?: string;
  groupId?: string;
  lessonId?: string;
  testId?: string;
  homeworkId?: string;
  uploadedAt: string;
}

// Communication Types
export type MessageType = 'DAILY_UPDATE' | 'HOMEWORK' | 'TEST_RESULT' | 'MONTHLY_REPORT';

export interface ParentCommunication {
  id: string;
  studentId?: string;
  groupId?: string;
  lessonId?: string;
  messageType: MessageType;
  messageText: string;
  sentAt: string;
  status: 'DRAFT' | 'PREVIEWED' | 'SENT';
}
