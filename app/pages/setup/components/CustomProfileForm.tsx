import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import type { ArchetypeId, GovernmentProfile } from '@/shared/types'
import type { ProfilePreset } from './profile-presets'

const customProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required'),
  description: z.string().min(1, 'Description is required'),
  flavor: z.string().min(10, 'Personality text should be at least 10 characters'),
  keywords: z.string(),
  archetypeId: z.string().min(1, 'Select an archetype'),
})

type CustomProfileValues = z.infer<typeof customProfileSchema>

interface CustomProfileFormProps {
  archetypes: { id: string; name: string }[]
  onUpdate: (profile: GovernmentProfile, archetype: ArchetypeId) => void
  ideology?: Record<string, number>
}

export function CustomProfileForm({ archetypes, onUpdate, ideology }: CustomProfileFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<CustomProfileValues>({
    resolver: zodResolver(customProfileSchema),
    defaultValues: { name: '', description: '', flavor: '', keywords: '', archetypeId: '' },
    mode: 'onChange',
  })

  const selectedArchetype = form.watch('archetypeId')

  const saveProfileMutation = useMutation({
    mutationFn: (preset: ProfilePreset) => window.conveyor.government.saveCustomProfile(preset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['government', 'customProfiles'] })
      toast.success('Profile saved', { description: 'Custom profile is now available for future games' })
    },
  })

  // Push changes to parent on every valid change
  const pushUpdate = (values: CustomProfileValues) => {
    const profile: GovernmentProfile = {
      id: `custom-${Date.now()}`,
      name: values.name,
      description: values.description,
      flavor: values.flavor,
      keywords: values.keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    onUpdate(profile, values.archetypeId as ArchetypeId)
  }

  return (
    <Form {...form}>
      <form onChange={form.handleSubmit(pushUpdate, () => {})} className="p-4 space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[8px] uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Profile Name
              </FormLabel>
              <FormControl>
                <Input
                  className="h-8 text-sm bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                  placeholder="e.g., Iron Fist, Enlightened Despot, Trade Baron..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[9px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[8px] uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Short Description
              </FormLabel>
              <FormControl>
                <Input
                  className="h-7 text-[10px] bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                  placeholder="One-line summary of this government style..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[9px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="flavor"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[8px] uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Personality & Flavor
              </FormLabel>
              <p className="text-[8px] text-muted-foreground mb-1">
                Shapes how the AI speaks. Describe tone, vocabulary, how it addresses the player.
              </p>
              <FormControl>
                <textarea
                  className="w-full rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-void)] px-3 py-2 text-[10px] text-foreground/60 placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:border-[var(--cic-cyan-dim)]"
                  rows={4}
                  placeholder="e.g., You speak as a ruthless warlord. Every recommendation is framed in terms of conquest..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[9px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[8px] uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Keywords <span className="text-muted-foreground/70">(comma-separated)</span>
              </FormLabel>
              <FormControl>
                <Input
                  className="h-7 text-[10px] bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                  placeholder="e.g., Commander, glory, conquest, honor"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="archetypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[8px] uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Archetype
              </FormLabel>
              <div className="flex flex-wrap gap-1">
                {archetypes.map((arch) => (
                  <Badge
                    key={arch.id}
                    variant="outline"
                    className={`cursor-pointer text-[8px] px-2 py-0.5 h-5 transition-all ${
                      selectedArchetype === arch.id
                        ? 'border-[var(--cic-cyan-dim)] text-[var(--cic-cyan)] bg-[var(--cic-cyan-glow)]'
                        : 'border-[var(--cic-panel-edge)] text-foreground/30 hover:text-foreground/60'
                    }`}
                    onClick={() => {
                      field.onChange(arch.id)
                      // Trigger update manually since badge click doesn't fire form onChange
                      const values = form.getValues()
                      const profile: GovernmentProfile = {
                        id: `custom-${Date.now()}`,
                        name: values.name,
                        description: values.description,
                        flavor: values.flavor,
                        keywords: values.keywords
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }
                      onUpdate(profile, arch.id as ArchetypeId)
                    }}
                  >
                    {arch.name}
                  </Badge>
                ))}
              </div>
              <FormMessage className="text-[9px]" />
            </FormItem>
          )}
        />

        {/* Save Profile button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!form.formState.isValid || saveProfileMutation.isPending}
          className="w-full border-[var(--cic-cyan-dim)]/30 text-[var(--cic-cyan-dim)] hover:bg-[var(--cic-cyan-glow)] hover:text-[var(--cic-cyan)] disabled:opacity-30 text-[10px]"
          onClick={() => {
            const values = form.getValues()
            const preset: ProfilePreset = {
              profile: {
                id: `custom-${Date.now()}`,
                name: values.name,
                description: values.description,
                flavor: values.flavor,
                keywords: values.keywords
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
              archetype: values.archetypeId as ArchetypeId,
              ideology: ideology ?? {
                xenophobia: 50,
                diplomacy: 50,
                militancy: 50,
                expansionism: 50,
                determination: 50,
                trade: 50,
              },
              ministries: [],
            }
            saveProfileMutation.mutate(preset)
          }}
        >
          <Save className="h-3 w-3" />
          Save Profile
        </Button>
      </form>
    </Form>
  )
}
