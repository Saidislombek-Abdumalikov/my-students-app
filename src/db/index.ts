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
      lessonPlans: 'id, lessonId',
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
  const existingGroups = await db.groups.count();
  if (existingGroups > 0) {
    return; // Already initialized
  }

  console.log('Clearing and seeding exact requested groups and students...');

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStr = todayStr.slice(0, 7);

  // 1. Teacher
  const teacherUser: User = {
    id: 't-1',
    email: 'teacher@learningcenter.com',
    fullName: 'O\'qituvchi',
    role: 'TEACHER',
    createdAt: new Date().toISOString()
  };
  await db.users.put(teacherUser);

  // 2. Exact 3 Requested Groups
  const group1: Group = {
    id: 'g-pre-inter-8-10',
    name: 'Pre-Intermediate 08:00 - 10:00',
    teacherId: 't-1',
    courseSubject: 'General English',
    level: 'Pre-Intermediate',
    scheduleDescription: '08:00 - 10:00',
    startDate: '2026-08-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  const group2: Group = {
    id: 'g-kids-10-12',
    name: 'Kids 10:00 - 12:00',
    teacherId: 't-1',
    courseSubject: 'Kids English',
    level: 'Beginner',
    scheduleDescription: '10:00 - 12:00',
    startDate: '2026-08-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  const group3: Group = {
    id: 'g-kids-13-15',
    name: 'Kids 13:30 - 15:30',
    teacherId: 't-1',
    courseSubject: 'Kids English',
    level: 'Beginner',
    scheduleDescription: '13:30 - 15:30',
    startDate: '2026-08-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  const initialGroups = [group1, group2, group3];
  await db.groups.bulkPut(initialGroups);

  // 3. Students (6 per group = 18 total)
  const group1Students: Student[] = [
    { id: 's-101', fullName: 'Sardor Rahimjonov', phone: '', parentName: 'Dilshod', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-102', fullName: 'Malika Alimova', phone: '', parentName: 'Nigora', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-103', fullName: 'Jasur Karimov', phone: '', parentName: 'Otabek', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-104', fullName: 'Madina Usmanova', phone: '', parentName: 'Gulnora', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-105', fullName: 'Bekzod Rahimov', phone: '', parentName: 'Jamshid', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-106', fullName: 'Laylo Sobirova', phone: '', parentName: 'Feruza', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
  ];

  const group2Students: Student[] = [
    { id: 's-201', fullName: 'Aziza Toshmatova', phone: '', parentName: 'Anvar', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-202', fullName: 'Muhammadali Qodirov', phone: '', parentName: 'Shavkat', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-203', fullName: 'Nigora Aliyeva', phone: '', parentName: 'Bobur', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-204', fullName: 'Shoxrux Mirzayev', phone: '', parentName: 'Ilhom', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-205', fullName: 'Ziyoda Ismoilova', phone: '', parentName: 'Lola', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-206', fullName: 'Bilol Ikromov', phone: '', parentName: 'Akmal', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
  ];

  const group3Students: Student[] = [
    { id: 's-301', fullName: 'Diyorbek Xasanov', phone: '', parentName: 'Rustam', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-302', fullName: 'Munisa Yuldasheva', phone: '', parentName: 'Dilfuza', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-303', fullName: 'Javohir Normatov', phone: '', parentName: 'Sardor', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-304', fullName: 'Rayhona Sharipova', phone: '', parentName: 'Guli', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-305', fullName: 'Temur Olimov', phone: '', parentName: 'Sherzod', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 's-306', fullName: 'Samira Azimova', phone: '', parentName: 'Nodira', parentPhone: '', enrollmentDate: '2026-08-01', status: 'ACTIVE', createdAt: new Date().toISOString() },
  ];

  const allStudents = [...group1Students, ...group2Students, ...group3Students];
  await db.students.bulkPut(allStudents);

  // Group Memberships
  const memberships: GroupStudent[] = [
    ...group1Students.map((s) => ({ id: `gs-${s.id}`, groupId: 'g-pre-inter-8-10', studentId: s.id, joinedAt: '2026-08-01', status: 'ACTIVE' as const })),
    ...group2Students.map((s) => ({ id: `gs-${s.id}`, groupId: 'g-kids-10-12', studentId: s.id, joinedAt: '2026-08-01', status: 'ACTIVE' as const })),
    ...group3Students.map((s) => ({ id: `gs-${s.id}`, groupId: 'g-kids-13-15', studentId: s.id, joinedAt: '2026-08-01', status: 'ACTIVE' as const })),
  ];
  await db.groupStudents.bulkPut(memberships);

  // 4. Initial Payments (To'langan & QARZDOR samples)
  const payments: Payment[] = [
    { id: 'p-101', studentId: 's-101', groupId: 'g-pre-inter-8-10', amount: 0, paymentDate: todayStr, periodMonth: monthStr, paymentMethod: 'CASH', status: 'PAID', createdAt: new Date().toISOString() },
    { id: 'p-102', studentId: 's-102', groupId: 'g-pre-inter-8-10', amount: 0, paymentDate: '', periodMonth: monthStr, paymentMethod: 'CASH', status: 'UNPAID', createdAt: new Date().toISOString() },
    { id: 'p-103', studentId: 's-103', groupId: 'g-pre-inter-8-10', amount: 0, paymentDate: todayStr, periodMonth: monthStr, paymentMethod: 'CASH', status: 'PAID', createdAt: new Date().toISOString() },
    { id: 'p-201', studentId: 's-201', groupId: 'g-kids-10-12', amount: 0, paymentDate: todayStr, periodMonth: monthStr, paymentMethod: 'CASH', status: 'PAID', createdAt: new Date().toISOString() },
    { id: 'p-202', studentId: 's-202', groupId: 'g-kids-10-12', amount: 0, paymentDate: '', periodMonth: monthStr, paymentMethod: 'CASH', status: 'UNPAID', createdAt: new Date().toISOString() },
    { id: 'p-301', studentId: 's-301', groupId: 'g-kids-13-15', amount: 0, paymentDate: todayStr, periodMonth: monthStr, paymentMethod: 'CASH', status: 'PAID', createdAt: new Date().toISOString() },
    { id: 'p-302', studentId: 's-302', groupId: 'g-kids-13-15', amount: 0, paymentDate: '', periodMonth: monthStr, paymentMethod: 'CASH', status: 'UNPAID', createdAt: new Date().toISOString() },
  ];
  await db.payments.bulkPut(payments);

  // Fire async Firebase sync in background
  syncCollectionToCloud('groups', initialGroups).catch(console.error);
  syncCollectionToCloud('students', allStudents).catch(console.error);
  syncCollectionToCloud('payments', payments).catch(console.error);
}
