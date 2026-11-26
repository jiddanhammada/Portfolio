import {defineField, defineType} from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title', maxLength: 60}, validation: (r) => r.required()}),
    defineField({name: 'type', title: 'Category label', type: 'string', description: 'e.g. Branding, Web Design'}),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: [{title: 'Completed', value: 'completed'}, {title: 'Ongoing', value: 'ongoing'}], layout: 'radio'},
      initialValue: 'completed',
      validation: (r) => r.required(),
    }),
    defineField({name: 'date', type: 'date', initialValue: () => new Date().toISOString().slice(0, 10), validation: (r) => r.required()}),
    defineField({name: 'caption', title: 'Short description', type: 'text', rows: 3, validation: (r) => r.required().max(200)}),
    defineField({name: 'details', title: 'Details (optional, shown on the project page)', type: 'text', rows: 6}),
    defineField({
      name: 'images',
      title: 'Photos',
      description: 'The first photo is the main photo. Drag to reorder.',
      type: 'array',
      of: [{type: 'image', options: {hotspot: true}}],
      validation: (r) => r.required().min(1),
    }),
  ],
})
