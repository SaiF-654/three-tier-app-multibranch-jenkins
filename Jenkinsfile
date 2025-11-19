pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub_credentials'
        IMAGE_TAG = "${BRANCH_NAME}-${BUILD_NUMBER}"
        DOCKERHUB_USER = 'saifrehman123'
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        echo $DH_PASS | docker login -u $DH_USER --password-stdin
                    '''
                }
            }
        }

        stage('Build & Tag Images') {
            steps {
                script {
                    env.FRONTEND_TAG_DH = "${env.DOCKERHUB_USER}/three-tier-app-frontend:${IMAGE_TAG}"
                    env.BACKEND_TAG_DH  = "${env.DOCKERHUB_USER}/three-tier-app-backend:${IMAGE_TAG}"

                    sh """
                        docker build -t ${env.BACKEND_TAG_DH} ./backend
                        docker build -t ${env.FRONTEND_TAG_DH} ./frontend
                    """
                }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                sh """
                    docker push ${env.BACKEND_TAG_DH}
                    docker push ${env.FRONTEND_TAG_DH}
                """
            }
        }

        stage('Prepare .env for Compose') {
            steps {
                script {
                    writeFile(
                        file: '.env',
                        text: """
BACKEND_IMAGE=${env.BACKEND_TAG_DH}
FRONTEND_IMAGE=${env.FRONTEND_TAG_DH}
"""
                    )
                }
            }
        }

        stage('Approval for Staging / Prod Deploy') {
            when {
                anyOf {
                    branch 'stg'
                    branch 'prod'
                }
            }
            steps {
                input message: "Deploy to ${BRANCH_NAME} environment?", ok: "Yes, Deploy"
            }
        }

        stage('Deploy Environment') {
            steps {
                sh """
                    docker-compose --env-file .env down
                    docker-compose --env-file .env pull
                    docker-compose --env-file .env up -d --remove-orphans
                """
            }
        }

        stage('Cleanup Local Images') {
            steps {
                sh """
                    docker rmi ${env.BACKEND_TAG_DH} ${env.FRONTEND_TAG_DH} || true
                """
            }
        }
    }

    post {
        success {
            echo "✅ ${BRANCH_NAME} environment deployed successfully!"
        }
        failure {
            echo "❌ Deployment failed for ${BRANCH_NAME}. Check logs."
        }
    }
}
