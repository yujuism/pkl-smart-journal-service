import { relations } from 'drizzle-orm'
import { schools } from './schools.ts'
import { users } from './users.ts'
import { students } from './students.ts'
import { pklPlacements } from './placements.ts'
import { journals } from './journals.ts'
import { feedbacks } from './feedbacks.ts'
import { competencyGuidelines } from './guidelines.ts'
import { aiEvaluations } from './evaluations.ts'
import { whatsappLogs } from './whatsapp_logs.ts'

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  students: many(students),
  guidelines: many(competencyGuidelines),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  student: one(students, { fields: [users.id], references: [students.userId] }),
  feedbacksGiven: many(feedbacks),
}))

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  school: one(schools, { fields: [students.schoolId], references: [schools.id] }),
  placements: many(pklPlacements),
  journals: many(journals),
  evaluations: many(aiEvaluations),
}))

export const pklPlacementsRelations = relations(pklPlacements, ({ one, many }) => ({
  student: one(students, { fields: [pklPlacements.studentId], references: [students.id] }),
  teacher: one(users, { fields: [pklPlacements.teacherId], references: [users.id] }),
  journals: many(journals),
  evaluations: many(aiEvaluations),
}))

export const journalsRelations = relations(journals, ({ one, many }) => ({
  student: one(students, { fields: [journals.studentId], references: [students.id] }),
  placement: one(pklPlacements, { fields: [journals.placementId], references: [pklPlacements.id] }),
  feedbacks: many(feedbacks),
  waLogs: many(whatsappLogs),
}))

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  journal: one(journals, { fields: [feedbacks.journalId], references: [journals.id] }),
  reviewer: one(users, { fields: [feedbacks.reviewerId], references: [users.id] }),
}))

export const aiEvaluationsRelations = relations(aiEvaluations, ({ one }) => ({
  student: one(students, { fields: [aiEvaluations.studentId], references: [students.id] }),
  placement: one(pklPlacements, { fields: [aiEvaluations.placementId], references: [pklPlacements.id] }),
}))

export const whatsappLogsRelations = relations(whatsappLogs, ({ one }) => ({
  journal: one(journals, { fields: [whatsappLogs.journalId], references: [journals.id] }),
}))
