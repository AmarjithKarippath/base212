import type { RoleDefinition } from '../types'

interface RoleSelectorProps {
  roles: RoleDefinition[]
  selectedIds: string[]
  allowMultiple: boolean
  onChange: (ids: string[]) => void
}

export function RoleSelector({
  roles,
  selectedIds,
  allowMultiple,
  onChange,
}: RoleSelectorProps) {
  const toggleRole = (roleId: string) => {
    if (allowMultiple) {
      if (selectedIds.includes(roleId)) {
        onChange(selectedIds.filter((id) => id !== roleId))
        return
      }
      onChange([...selectedIds, roleId])
      return
    }

    onChange(selectedIds.includes(roleId) ? [] : [roleId])
  }

  return (
    <div className="role-selector">
      <div className="role-selector__header">
        <span className="role-selector__title">AI Team</span>
        <span className="role-selector__hint">
          {allowMultiple ? 'Select one or more roles' : 'Select one role'}
        </span>
      </div>
      <div className="role-selector__grid">
        {roles.map((role) => {
          const selected = selectedIds.includes(role.id)
          return (
            <button
              key={role.id}
              type="button"
              className={`role-chip ${selected ? 'role-chip--selected' : ''}`}
              onClick={() => toggleRole(role.id)}
            >
              <span className="role-chip__name">{role.name}</span>
              <span className="role-chip__category">{role.category}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
