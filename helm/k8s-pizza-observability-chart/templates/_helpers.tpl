{{/* Generate common labels */}}
{{- define "k8s-pizza-observability.labels" -}}
{{ .Values.global.labels | toYaml }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end -}}