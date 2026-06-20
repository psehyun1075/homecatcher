import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { TodoCompleteScreen } from "../screens/todos/todo-complete-screen";
import { TodoDetailScreen } from "../screens/todos/todo-detail-screen";
import { TodoListScreen } from "../screens/todos/todo-list-screen";
import { colors } from "../theme/colors";
import type { TodosStackParamList } from "./types";

const Stack = createNativeStackNavigator<TodosStackParamList>();

export function TodosNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Stack.Screen name="TodoList" component={TodoListScreen} options={{ title: "할 일" }} />
      <Stack.Screen name="TodoDetail" component={TodoDetailScreen} options={{ title: "할 일 상세" }} />
      <Stack.Screen name="TodoComplete" component={TodoCompleteScreen} options={{ title: "완료 기록" }} />
    </Stack.Navigator>
  );
}
