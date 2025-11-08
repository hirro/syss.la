# Syssla Coding Style Guide

This document defines conventions for the **Syssla** project.  
It ensures consistency across React Native (Expo), TypeScript, and backend service code.

---

## 🧩 General Philosophy
- **Clarity over cleverness** — write simple, explicit code.
- **Predictability** — similar patterns across the entire codebase.
- **Functional by default** — prefer pure functions and immutable data where practical.
- **Type safety** — leverage TypeScript’s strict mode; avoid `any`.
- **Minimal comments** — code should be self-documenting.
- **Consistent naming** — follow a clear, predictable convention.

---

## 🧱 Project Structure
```
app/
 ├─ components/
 ├─ screens/
 ├─ hooks/
 ├─ services/
 ├─ lib/
 ├─ types/
 └─ utils/
```

- Keep directories flat and names lowercase.
- Co-locate tests with their source files (`Foo.test.ts`).

---

## 🧠 TypeScript Style

- `strict` mode enabled.
- Use **type aliases** for data models (`type Todo = {...}`), **interfaces** for APIs.
- Prefer **readonly** for immutable structures.
- Avoid `null` — use `undefined` or optional properties.
- Avoid enums; use union types (`type Status = "open" | "done"`).

### Naming
| Element | Convention | Example |
|----------|-------------|----------|
| Components | PascalCase | `TodoList.tsx` |
| Hooks | useCamelCase | `useTodoStore.ts` |
| Files | kebab-case | `todo-list-item.tsx` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT_MS` |
| Interfaces/Types | PascalCase | `TodoItem`, `ProjectEntry` |

---

## 🎨 React / Expo

- Functional components only (`function Component()`).
- Use React hooks for state and side effects.
- Keep components **pure and small** — 1 purpose per file.
- Style with **Tailwind RN** or **StyleSheet.create** (no inline objects).
- All screens must be typed via React Navigation types.

### Example
```tsx
type Props = { projectId: string };

export function ProjectScreen({ projectId }: Props) {
  const { project } = useProject(projectId);
  return <ProjectView project={project} />;
}
```

---

## ⚙️ Async & Data

- Use `async/await` — no `.then()` chaining.
- Centralize API calls in `/services/github/`.
- Use `try/catch` blocks only where necessary; otherwise, let global handlers manage errors.
- Prefer **repository pattern** for persistence (GitHub, local DB).

---

## 🧪 Testing

- Framework: **Jest + Testing Library**.
- Test behavior, not implementation.
- Snapshot tests only for stable UI components.
- Naming: `<file>.test.ts` or `<file>.test.tsx`.

Example:
```ts
describe("TodoService", () => {
  it("creates a new todo item", async () => {
    const todo = await createTodo("Test");
    expect(todo.title).toBe("Test");
  });
});
```

---

## 🧾 Formatting & Tooling

- **Prettier** for formatting  
- **ESLint** for static rules  
- **Husky** + **lint-staged** for pre-commit hooks  

Recommended Prettier settings:
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

---

## 🧭 Git & Commits

- Conventional commits (e.g. `feat:`, `fix:`, `chore:`, `refactor:`).  
- Keep PRs focused — one logical change per PR.  
- Include a brief description of *why* not just *what*.

### ✅ Example Commit Messages
```
feat(todo): add ability to filter completed tasks
fix(sync): handle GitHub rate limit responses
refactor(time): simplify project duration calculation
```

---

## 💬 Notes
- Use English for identifiers, code, and comments.
- Use descriptive names: `startTimer()` > `go()`.
- Avoid abbreviations unless universally known (`URL`, `ID`).

---

**Syssla Style — clarity, consistency, composure.**
