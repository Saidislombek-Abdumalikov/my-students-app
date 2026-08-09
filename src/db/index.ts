import Dexie, { Table } from 'dexie';
import { syncCollectionToCloud } from '../services/firebase';
import {
  User,
  Student,
  Group,
  GroupStudent,
  Lesson,
  Attendance,
  HomeworkPackage,
  HomeworkTask,
  HomeworkSubmission,
  HomeworkLibraryItem,
  Test,
  TestResult,
  LessonPlan,
  LearnedMaterial,
  Payment,
  FileRecord,
  ParentCommunication
} from '../types';

export class AppDatabase extends Dexie {
  users!: Table<User, string>;
  students!: Table<Student, string>;
  groups!: Table<Group, string>;
  groupStudents!: Table<GroupStudent, string>;
  lessons!: Table<Lesson, string>;
  attendance!: Table<Attendance, string>;
  homeworkPackages!: Table<HomeworkPackage, string>;
  homeworkTasks!: Table<HomeworkTask, string>;
  homeworkSubmissions!: Table<HomeworkSubmission, string>;
  homeworkLibrary!: Table<HomeworkLibraryItem, string>;
  tests!: Table<Test, string>;
  testResults!: Table<TestResult, string>;
  lessonPlans!: Table<LessonPlan, string>;
  learnedMaterial!: Table<LearnedMaterial, string>;
  payments!: Table<Payment, string>;
  files!: Table<FileRecord, string>;
  parentCommunications!: Table<ParentCommunication, string>;

  constructor() {
    super('TeacherOSDatabase');
    
    this.version(1).stores({
      users: 'id, email, role',
      students: 'id, fullName, phone, status',
      groups: 'id, name, teacherId, status',
      groupStudents: 'id, groupId, studentId, [groupId+studentId]',
      lessons: 'id, groupId, date, status, [groupId+date]',
      attendance: 'id, lessonId, studentId, status, [lessonId+studentId]',
      homeworkPackages: 'id, groupId, lessonId',
      homeworkTasks: 'id, packageId, taskType',
      homeworkSubmissions: 'id, taskId, studentId, status, [taskId+studentId]',
      homeworkLibrary: 'id, title, courseSubject, category',
      tests: 'id, groupId, date, category',
      testResults: 'id, testId, studentId, [testId+studentId]',
      lessonPlans: 'id, lessonId, groupId, targetDate, status',
      learnedMaterial: 'id, lessonId',
      payments: 'id, studentId, groupId, periodMonth, status',
      files: 'id, studentId, groupId, lessonId, testId',
      parentCommunications: 'id, studentId, groupId, lessonId, messageType'
    });
  }
}

export const db = new AppDatabase();

// Seed Database function with exact requested groups & students
export async function seedInitialData() {
  // One-time purge of legacy sample homeworks, library items, and sample tests
  const legacySampleCount = await db.homeworkLibrary.count();
  const legacySamplePackageCount = await db.homeworkPackages.where('id').startsWith('hp-sample').count();
  if (legacySampleCount > 0 || legacySamplePackageCount > 0) {
    await db.homeworkPackages.clear();
    await db.homeworkTasks.clear();
    await db.homeworkSubmissions.clear();
    await db.homeworkLibrary.clear();
    await db.tests.clear();
    await db.testResults.clear();
  }

  const existingUsers = await db.users.count();
  if (existingUsers === 0) {
    const teacherUser: User = {
      id: 't-1',
      email: 'teacher@learningcenter.com',
      fullName: 'O\'qituvchi',
      role: 'TEACHER',
      createdAt: new Date().toISOString()
    };
    await db.users.put(teacherUser);
  }
}
